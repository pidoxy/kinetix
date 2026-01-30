
import asyncio
import base64
import json
import os
import time
from datetime import datetime, timezone

from google import genai
from google.genai import types
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file")

client = genai.Client(api_key=GEMINI_API_KEY)

# --- AI Model Setup ---
ANALYSIS_MODEL_NAME = "gemini-3-flash-preview"
TTS_MODEL_NAME = "gemini-3-flash-preview"


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

IMPORTANT: If the user's full body is not visible (too close, partially out of frame, etc.), do NOT over-explain this technically. Simply tell them to step back or adjust their camera. Provide your best analysis with whatever IS visible rather than refusing to analyze. Only use "RED" for actual form problems, not for camera positioning.

Example for good form:
{
  "thought_signature": "Spine is neutral, core is engaged. Squat depth is adequate, knees tracking over toes. No valgus collapse detected.",
  "status": "GREEN",
  "speech_text": "Great form! Keep this pace."
}

Example for poor form:
{
  "thought_signature": "Thoracic flexion increasing, lumbar stability compromised. Knees caving inward (valgus collapse). Injury risk elevated.",
  "status": "RED",
  "speech_text": "Stop. Straighten your back and keep your knees out."
}

Example when user is too close or partially visible:
{
  "thought_signature": "Only upper body visible. Shoulder alignment and thoracic posture appear sound from current view.",
  "status": "GREEN",
  "speech_text": "Step back so I can see your full body."
}

Analyze each frame independently and provide immediate, relevant feedback.
Do not include markdown formatting in your response.
Your entire response must be a single, valid JSON object.
"""

SUMMARY_PROMPT_TEMPLATE = """
The exercise session has now ended. Here are the session statistics:

- Duration: {duration_formatted} ({duration_seconds} seconds)
- Total frames analyzed: {total_frames}
- Good form (GREEN): {green_count} ({green_percentage:.1f}%)
- Poor form (RED): {red_count} ({red_percentage:.1f}%)
- Form rating: {rating}
- Top corrections given: {top_corrections}

Based on your analysis throughout this session, provide a summary in the following JSON format:
{{
  "overall_assessment": "2-3 sentence overall assessment of the user's performance",
  "strengths": ["strength 1", "strength 2", ...],
  "areas_for_improvement": ["area 1", "area 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "encouragement": "1 sentence of encouragement"
}}

Be specific and reference actual observations you made during the session.
Your entire response must be a single valid JSON object matching the format above.
"""

generation_config = types.GenerateContentConfig(
    temperature=0.2,
    top_p=0.95,
    top_k=64,
    max_output_tokens=8192,
    response_mime_type="application/json",
    system_instruction=SYSTEM_INSTRUCTION,
    safety_settings=[
        types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="OFF"),
        types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"),
        types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"),
        types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"),
    ],
)

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
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=TTS_MODEL_NAME,
            contents=f"Please say '{text}' in a clear and encouraging tone.",
        )
        # The API returns audio data directly. We need to find it in the response parts.
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data and part.inline_data.mime_type.startswith("audio/"):
                    print("Audio generated successfully.")
                    return base64.b64encode(part.inline_data.data).decode('utf-8')
        print("TTS response did not contain audio data.")
        return None
    except Exception as e:
        print(f"Error during text-to-speech generation: {e}")
        return None


def _compute_rating(green_pct):
    """Compute a form rating from green percentage."""
    if green_pct >= 90:
        return "EXCELLENT"
    elif green_pct >= 75:
        return "GOOD"
    elif green_pct >= 55:
        return "FAIR"
    else:
        return "NEEDS_WORK"


def _get_top_corrections(analyses, max_items=5):
    """Extract deduplicated correction texts from RED frames."""
    seen = set()
    corrections = []
    for entry in analyses:
        if entry.get("status") == "RED":
            text = entry.get("speech_text", "")
            if text and text not in seen:
                seen.add(text)
                corrections.append(text)
                if len(corrections) >= max_items:
                    break
    return corrections


def build_fallback_summary(session_data):
    """Build a stats-only summary when Gemini is unavailable."""
    duration = time.time() - session_data["start_time"]
    total = session_data["green_count"] + session_data["red_count"]
    green_pct = (session_data["green_count"] / total * 100) if total > 0 else 0.0
    minutes, seconds = divmod(int(duration), 60)

    return {
        "session_duration_seconds": int(duration),
        "session_duration_formatted": f"{minutes:02d}:{seconds:02d}",
        "total_frames_analyzed": total,
        "form_score": {
            "green_count": session_data["green_count"],
            "red_count": session_data["red_count"],
            "green_percentage": round(green_pct, 1),
            "rating": _compute_rating(green_pct) if total > 0 else "NO_DATA",
        },
        "ai_summary": None,
        "corrections_given": session_data["red_count"],
        "top_corrections": _get_top_corrections(session_data["analyses"]),
    }


async def generate_session_summary(chat, session_data):
    """Generate a full session summary with AI narrative."""
    duration = time.time() - session_data["start_time"]
    total = session_data["green_count"] + session_data["red_count"]
    green_pct = (session_data["green_count"] / total * 100) if total > 0 else 0.0
    red_pct = 100.0 - green_pct if total > 0 else 0.0
    minutes, seconds = divmod(int(duration), 60)
    duration_formatted = f"{minutes:02d}:{seconds:02d}"
    rating = _compute_rating(green_pct) if total > 0 else "NO_DATA"
    top_corrections = _get_top_corrections(session_data["analyses"])

    base_summary = {
        "session_duration_seconds": int(duration),
        "session_duration_formatted": duration_formatted,
        "total_frames_analyzed": total,
        "form_score": {
            "green_count": session_data["green_count"],
            "red_count": session_data["red_count"],
            "green_percentage": round(green_pct, 1),
            "rating": rating,
        },
        "ai_summary": None,
        "corrections_given": session_data["red_count"],
        "top_corrections": top_corrections,
    }

    if total == 0:
        return base_summary

    try:
        prompt = SUMMARY_PROMPT_TEMPLATE.format(
            duration_formatted=duration_formatted,
            duration_seconds=int(duration),
            total_frames=total,
            green_count=session_data["green_count"],
            green_percentage=green_pct,
            red_count=session_data["red_count"],
            red_percentage=red_pct,
            rating=rating,
            top_corrections=", ".join(top_corrections) if top_corrections else "None",
        )

        response = await asyncio.to_thread(chat.send_message, prompt)
        response_text = response.text
        print(f"Summary response from Gemini: {response_text}")

        ai_summary = json.loads(response_text)
        base_summary["ai_summary"] = {
            "overall_assessment": ai_summary.get("overall_assessment", ""),
            "strengths": ai_summary.get("strengths", []),
            "areas_for_improvement": ai_summary.get("areas_for_improvement", []),
            "recommendations": ai_summary.get("recommendations", []),
            "encouragement": ai_summary.get("encouragement", ""),
        }
    except Exception as e:
        print(f"Error generating AI summary: {e}")
        # ai_summary stays None — fallback to stats-only

    return base_summary


@app.websocket("/ws/session")
async def websocket_session(websocket: WebSocket):
    """
    Handles the real-time video streaming and AI analysis session.
    """
    await websocket.accept()
    print("WebSocket connection accepted.")

    chat = client.chats.create(model=ANALYSIS_MODEL_NAME, config=generation_config)

    session_data = {
        "start_time": time.time(),
        "green_count": 0,
        "red_count": 0,
        "analyses": [],  # capped at 500 entries
    }

    try:
        while True:
            message_json = await websocket.receive_json()
            message_type = message_json.get("type")

            if message_type == "END_SESSION":
                print("Received END_SESSION — generating summary...")
                try:
                    summary = await generate_session_summary(chat, session_data)
                    await websocket.send_json({"type": "SESSION_SUMMARY", "data": summary})
                except Exception as e:
                    print(f"Error during summary generation: {e}")
                    summary = build_fallback_summary(session_data)
                    await websocket.send_json({"type": "SESSION_SUMMARY", "data": summary})
                await websocket.send_json({"type": "SESSION_ENDED"})
                break

            if message_type != "VIDEO_FRAME":
                print(f"Received non-video message, skipping: {message_type}")
                continue

            base64_image = message_json.get("data")
            if not base64_image:
                continue

            try:
                image_bytes = base64.b64decode(base64_image)
            except Exception as e:
                print(f"Error decoding image: {e}")
                continue

            try:
                print("Sending frame to Gemini...")
                image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
                response = await asyncio.to_thread(chat.send_message, image_part)
                response_text = response.text
                print(f"Received from Gemini: {response_text}")

                analysis_data = json.loads(response_text)

                # Accumulate session data
                status = analysis_data.get("status")
                if status == "GREEN":
                    session_data["green_count"] += 1
                elif status == "RED":
                    session_data["red_count"] += 1
                if len(session_data["analyses"]) < 500:
                    session_data["analyses"].append({
                        "status": status,
                        "speech_text": analysis_data.get("speech_text", ""),
                    })

                # Send Thought Signature
                thought = analysis_data.get("thought_signature")
                if thought:
                    await websocket.send_json({"type": "THOUGHT", "data": thought})

                # Send Status
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
        print("Client disconnected (no END_SESSION received).")
    except Exception as e:
        print(f"An unexpected error occurred in the WebSocket session: {e}")
    finally:
        total = session_data["green_count"] + session_data["red_count"]
        duration = time.time() - session_data["start_time"]
        print(f"Session stats — duration: {int(duration)}s, frames: {total}, "
              f"green: {session_data['green_count']}, red: {session_data['red_count']}")
        try:
            await websocket.close()
        except Exception:
            pass  # connection already closed


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)

    
    