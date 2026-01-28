
import asyncio
import base64
import io
import json
import os

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file")

genai.configure(api_key=GEMINI_API_KEY)

# --- AI Model Setup ---
ANALYSIS_MODEL_NAME = "gemini-1.5-pro-latest"
TTS_MODEL_NAME = "models/text-to-speech"


# The system instruction for the AI model
SYSTEM_INSTRUCTION = """
You are Kinetix, a world-class biomechanics coach and physical therapy assistant.
Your goal is to provide real-time, actionable feedback to users performing exercises.
You will receive a stream of video frames from the user's camera.
For each frame, you must analyze the user's posture, form, and movement.

Based on your analysis, you MUST return a single, valid JSON object with the following fields:
- "thought_signature": A brief, technical, and analytical thought process about the user's current form. This is your internal monologue, like a signature on an analysis. Use biomechanical terms.
- "status": A single word indicating the quality of the user's form. It must be either "GREEN" for good form or "RED" for poor form that requires correction.
- "speech_text": A concise, encouraging, and clear instruction for the user to either maintain their form or correct it. This text will be converted to speech. Keep it under 15 words.

Example for good form:
{
  "thought_signature": "User's spine is neutral, core is engaged. Squat depth is adequate, knees are tracking over feet. Excellent form.",
  "status": "GREEN",
  "speech_text": "Great form! Keep this pace."
}

Example for poor form:
{
  "thought_signature": "User's back is rounding, indicating a loss of lumbar stability. Knees are caving inward (valgus collapse). High risk of injury.",
  "status": "RED",
  "speech_text": "Stop. Straighten your back and keep your knees out."
}

Analyze each frame independently and provide immediate, relevant feedback.
Do not include markdown formatting (```json ... ```) in your response.
Your entire response must be a single, valid JSON object.
"""

generation_config = {
    "temperature": 0.2,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
    "response_mime_type": "application/json",
}

safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

analysis_model = genai.GenerativeModel(
    model_name=ANALYSIS_MODEL_NAME,
    safety_settings=safety_settings,
    generation_config=generation_config,
    system_instruction=SYSTEM_INSTRUCTION,
)

tts_model = genai.GenerativeModel(TTS_MODEL_NAME)

# --- FastAPI App ---
app = FastAPI()

# Configure CORS to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


@app.get("/")
def read_root():
    return {"status": "Kinetix AI Backend is running"}


async def text_to_speech(text):
    """Converts text to speech and returns the audio data as base64."""
    try:
        print(f"Generating audio for: '{text}'")
        response = await tts_model.generate_content_async(
            f"Please say '{text}' in a clear and encouraging tone.",
            stream=False
        )
        # The API returns audio data directly. We need to find it in the response parts.
        audio_part = next((part for part in response.parts if part.mime_type.startswith("audio/")), None)
        if audio_part:
            print("Audio generated successfully.")
            return base64.b64encode(audio_part.data).decode('utf-8')
        else:
            print("TTS response did not contain audio data.")
            return None
    except Exception as e:
        print(f"Error during text-to-speech generation: {e}")
        return None


@app.websocket("/ws/session")
async def websocket_session(websocket: WebSocket):
    """
    Handles the real-time video streaming and AI analysis session.
    """
    await websocket.accept()
    print("WebSocket connection accepted.")

    chat_session = analysis_model.start_chat(history=[])

    try:
        while True:
            message_json = await websocket.receive_json()
            message_type = message_json.get("type")
            
            if message_type != "VIDEO_FRAME":
                print(f"Received non-video message, skipping: {message_type}")
                continue

            base64_image = message_json.get("data")
            if not base64_image:
                continue
            
            try:
                image_bytes = base64.b64decode(base64_image)
                image = Image.open(io.BytesIO(image_bytes))
            except Exception as e:
                print(f"Error decoding image: {e}")
                continue

            try:
                print("Sending frame to Gemini...")
                response = await chat_session.send_message_async(image, stream=False)
                response_text = response.text
                print(f"Received from Gemini: {response_text}")

                analysis_data = json.loads(response_text)
                
                # Send Thought Signature
                thought = analysis_data.get("thought_signature")
                if thought:
                    await websocket.send_json({"type": "THOUGHT", "data": thought})

                # Send Status
                status = analysis_data.get("status")
                if status:
                    await websocket.send_json({"type": "STATUS", "data": status})

                # Generate and send speech
                speech_text = analysis_data.get("speech_text")
                if speech_text:
                    audio_base64 = await text_to_speech(speech_text)
                    if audio_base64:
                        await websocket.send_json({"type": "SPEECH", "data": audio_base64})

            except (json.JSONDecodeError, KeyError) as e:
                print(f"Error parsing Gemini response: {e}")
                print(f"Raw response was: {response_text}")
                await websocket.send_json({"type": "ERROR", "data": "Error processing AI response."})
            except Exception as e:
                print(f"An unexpected error occurred during model communication: {e}")
                await websocket.send_json({"type": "ERROR", "data": f"Model communication error: {e}"})


    except WebSocketDisconnect:
        print("Client disconnected.")
    except Exception as e:
        print(f"An unexpected error occurred in the WebSocket session: {e}")
    finally:
        print("Closing WebSocket connection.")
        if not websocket.client_state == 'DISCONNECTED':
            await websocket.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)

    