import asyncio
import base64
import json
import os
import time
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import List

from google import genai
from google.generativeai import types
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file")

# Use the new GenerativeModel API
genai.configure(api_key=GEMINI_API_KEY)


# --- AI Model Setup ---
ANALYSIS_MODEL_NAME = "gemini-1.5-pro-latest"
TTS_MODEL_NAME = "models/text-to-speech"


# The system instruction for the AI model
SYSTEM_INSTRUCTION = """
You are Kinetix, an expert movement coach designed for non-experts.

INPUT: Real-time video frames of a user exercising.
OUTPUT: A single valid JSON object (no markdown).

YOUR DUAL ROLE:
1. THE ANALYST (Internal): Analyze biomechanics using precise medical terminology. Identify risks using proper anatomical terms (valgus, kyphosis, lordosis, protraction, etc.). This goes into "thought_signature".
2. THE COACH (External): Translate your analysis into simple, punchy, 5th-grade reading level commands. Use METAPHORS and ANALOGIES. This goes into "speech_text".

RULES FOR "speech_text":
- NEVER use medical words: valgus, kyphosis, lordosis, protraction, extension, flexion, scapular, cervical, thoracic, lumbar, anterior, posterior.
- ALWAYS use simple cues: "Chest up", "Knees out", "Squeeze your glutes", "Chin down", "Show me the logo on your shirt".
- Keep it under 10 words. The user is out of breath.
- If form is dangerous (RED), start with "Stop!" or "Careful!".
- If form is good (GREEN), be encouraging: "Perfect!", "Nailed it!", "Just like that!".
- If form is slightly off (YELLOW), be gentle: "Almost!", "Try to...".

STATUS VALUES:
- "GREEN": Form is within safe, optimal range. No correction needed.
- "YELLOW": Minor deviation. Not dangerous, but could be better. Gentle nudge.
- "RED": Dangerous form. Risk of injury. Urgent correction needed.
- "WAITING": You cannot see the user clearly (blurry, out of frame, too dark). Tell them exactly why and how to fix it.

CONFIDENCE RULE:
If the video is blurry, the user is partially out of frame, or you cannot confidently assess form, you MUST use status "WAITING". Do NOT guess. Tell the user exactly what to fix: "I can't see your hips. Step back a bit." or "The camera is too dark. Find better lighting."

JSON FORMAT:
{
  "thought_signature": "Technical analysis for logs (e.g., 'L4-L5 shear force risk due to lumbar flexion under load').",
  "status": "GREEN" | "YELLOW" | "RED" | "WAITING",
  "speech_text": "Simple cue for the user (e.g., 'Stick your butt out more!')."
}

TRANSLATION EXAMPLES:
- Knee Cave: thought="Valgus collapse detected on eccentric phase." → speech="Push your knees out sideways!"
- Rounded Back: thought="Thoracic kyphosis exceeding 40 degrees." → speech="Chest up! Show me the logo on your shirt."
- Arched Back: thought="Lumbar hyperextension with anterior pelvic tilt." → speech="Tuck your tailbone. Squeeze your abs."
- Head Forward: thought="Cervical protraction." → speech="Tuck your chin like you're making a double chin."
- Shrugging: thought="Scapular elevation active." → speech="Relax your shoulders down, away from your ears."
- Good Form: thought="Kinematic alignment within optimal range." → speech="Perfect. Make the next rep look exactly like that."
- Can't See: thought="Frame quality insufficient for reliable analysis." → speech="I can't see your legs. Step back from the camera."

Analyze each frame independently. Your entire response must be a single valid JSON object.
"""

SUMMARY_PROMPT_TEMPLATE = """
The exercise session has ended. Here are the stats:

- Duration: {duration_formatted} ({duration_seconds} seconds)
- Total frames analyzed: {total_frames}
- Good form (GREEN): {green_count} ({green_percentage:.1f}%)
- Needs tweaking (YELLOW): {yellow_count}
- Poor form (RED): {red_count} ({red_percentage:.1f}%)
- Form rating: {rating}
- Top corrections given: {top_corrections}

You are now THE COACH. Write a session summary for the user in simple, encouraging language. NO medical jargon. Write like you're talking to a friend after their workout.

Return a JSON object:
{{
  "overall_assessment": "2-3 sentences. Simple language. Mention specific things they did well and what to work on. Like a coach, not a doctor.",
  "strengths": ["Simple strength descriptions, e.g. 'Kept your back straight through most reps'"],
  "areas_for_improvement": ["Simple improvement descriptions, e.g. 'Knees were caving in during the bottom of your squat'"],
  "recommendations": ["Actionable tips, e.g. 'Try squeezing a ball between your knees to practice keeping them out'"],
  "encouragement": "1 sentence of genuine encouragement"
}}

Be specific. Reference what you actually saw. Keep everything at a 5th-grade reading level.
Your entire response must be a single valid JSON object.
"""

analysis_model = genai.GenerativeModel(
    ANALYSIS_MODEL_NAME,
    system_instruction=SYSTEM_INSTRUCTION,
    generation_config={
        "temperature": 0.2,
        "top_p": 0.95,
        "top_k": 64,
        "max_output_tokens": 8192,
        "response_mime_type": "application/json",
    },
     safety_settings=[
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
    ],
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
    """Extract deduplicated correction texts from RED and YELLOW frames."""
    seen = set()
    corrections = []
    for entry in analyses:
        if entry.get("status") in ("RED", "YELLOW"):
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
    total = session_data["green_count"] + session_data["yellow_count"] + session_data["red_count"]
    green_pct = (session_data["green_count"] / total * 100) if total > 0 else 0.0
    minutes, seconds = divmod(int(duration), 60)

    return {
        "session_duration_seconds": int(duration),
        "session_duration_formatted": f"{minutes:02d}:{seconds:02d}",
        "total_frames_analyzed": total,
        "form_score": {
            "green_count": session_data["green_count"],
            "yellow_count": session_data["yellow_count"],
            "red_count": session_data["red_count"],
            "green_percentage": round(green_pct, 1),
            "rating": _compute_rating(green_pct) if total > 0 else "NO_DATA",
        },
        "ai_summary": None,
        "corrections_given": session_data["red_count"] + session_data["yellow_count"],
        "top_corrections": _get_top_corrections(session_data["analyses"]),
    }


async def generate_session_summary(chat, session_data):
    """Generate a full session summary with AI narrative."""
    duration = time.time() - session_data["start_time"]
    total = session_data["green_count"] + session_data["yellow_count"] + session_data["red_count"]
    green_pct = (session_data["green_count"] / total * 100) if total > 0 else 0.0
    red_pct = (session_data["red_count"] / total * 100) if total > 0 else 0.0
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
            "yellow_count": session_data["yellow_count"],
            "red_count": session_data["red_count"],
            "green_percentage": round(green_pct, 1),
            "rating": rating,
        },
        "ai_summary": None,
        "corrections_given": session_data["red_count"] + session_data["yellow_count"],
        "top_corrections": top_corrections,
    }

    if total == 0:
        return base_summary

    try:
        # Switch the chat session to use the summary prompt
        summary_model = genai.GenerativeModel(
            ANALYSIS_MODEL_NAME,
            generation_config={
                "response_mime_type": "application/json",
            }
        )
        summary_chat = summary_model.start_chat()

        prompt = SUMMARY_PROMPT_TEMPLATE.format(
            duration_formatted=duration_formatted,
            duration_seconds=int(duration),
            total_frames=total,
            green_count=session_data["green_count"],
            green_percentage=green_pct,
            yellow_count=session_data["yellow_count"],
            red_count=session_data["red_count"],
            red_percentage=red_pct,
            rating=rating,
            top_corrections=", ".join(top_corrections) if top_corrections else "None",
        )

        response = await summary_chat.send_message_async(prompt)
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

    chat = analysis_model.start_chat(history=[])

    session_data = {
        "start_time": time.time(),
        "green_count": 0,
        "yellow_count": 0,
        "red_count": 0,
        "waiting_count": 0,
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
                image_part = {"mime_type": "image/jpeg", "data": image_bytes}
            except Exception as e:
                print(f"Error decoding image: {e}")
                continue

            try:
                print("Sending frame to Gemini...")
                response = await chat.send_message_async(image_part, stream=False)
                response_text = response.text
                print(f"Received from Gemini: {response_text}")

                analysis_data = json.loads(response_text)

                # Accumulate session data
                status = analysis_data.get("status")
                if status == "GREEN":
                    session_data["green_count"] += 1
                elif status == "YELLOW":
                    session_data["yellow_count"] += 1
                elif status == "RED":
                    session_data["red_count"] += 1
                elif status == "WAITING":
                    session_data["waiting_count"] += 1

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

                # Send speech text for display and generate audio
                speech_text = analysis_data.get("speech_text")
                if speech_text:
                    await websocket.send_json({"type": "SPEECH_TEXT", "data": speech_text})
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
        total = session_data["green_count"] + session_data["yellow_count"] + session_data["red_count"]
        duration = time.time() - session_data["start_time"]
        print(f"Session stats — duration: {int(duration)}s, frames: {total}, "
              f"green: {session_data['green_count']}, yellow: {session_data['yellow_count']}, "
              f"red: {session_data['red_count']}, waiting: {session_data['waiting_count']}")
        try:
            if not websocket.client_state == 'DISCONNECTED':
                await websocket.close()
        except Exception:
            pass  # connection already closed


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)

    