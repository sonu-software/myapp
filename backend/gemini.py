# gemini.py

import os
import json
import time
import threading
import google.generativeai as genai

from dotenv import load_dotenv

load_dotenv()

# ==============================
# CONFIG
# ==============================
MODEL = "gemini-2.5-flash"
KEY_COOLDOWN_SECONDS = 60  # cooldown if a key fails

SYSTEM_CONTEXT = """
You are an AI assistant inside a Business AI Prompt Generator app.

Your responsibilities:
- Help users understand and improve AI prompts
- Answer questions related to visuals, marketing messages, branding
- Give clear, structured, practical answers
- Stay aligned with the selected mode and business context
- Do NOT generate irrelevant content
"""

# ==============================
# LOAD API KEYS (SAFE PARSE)
# ==============================
raw_keys = os.getenv("GOOGLE_API_KEYS", "")

API_KEYS = [
    key.strip().replace('"', '').replace("'", "")
    for key in raw_keys.split(",")
    if key.strip()
]

if not API_KEYS:
    raise Exception("❌ No Gemini API keys found in .env")

# ==============================
# KEY MANAGER (THREAD SAFE)
# ==============================
class GeminiKeyManager:
    def __init__(self, keys):
        self.keys = keys
        self.index = 0
        self.lock = threading.Lock()
        self.failed_keys = {}  # key -> timestamp

    def get_next_key(self):
        with self.lock:
            total = len(self.keys)

            for _ in range(total):
                key = self.keys[self.index]
                self.index = (self.index + 1) % total

                # check cooldown
                if key in self.failed_keys:
                    last_failed = self.failed_keys[key]
                    if time.time() - last_failed < KEY_COOLDOWN_SECONDS:
                        continue  # skip temporarily

                return key

            return None  # all keys in cooldown

    def mark_failed(self, key):
        self.failed_keys[key] = time.time()

    def mark_success(self, key):
        if key in self.failed_keys:
            del self.failed_keys[key]


# Initialize manager
key_manager = GeminiKeyManager(API_KEYS)

# ==============================
# GEMINI CALL
# ==============================
def generate_with_key(api_key: str, prompt: str):
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(MODEL)
    return model.generate_content(prompt)


# ==============================
# SAFE JSON PARSER
# ==============================
def safe_json_parse(text: str) -> dict:
    text = text.strip()

    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(text)
    except Exception:
        return {}


# ==============================
# MAIN FUNCTION
# ==============================
def ask_gemini(message: str, context: dict) -> dict:

    fields = context.get("fields", [])
    field_list = "\n".join(fields)

    prompt = f"""
{SYSTEM_CONTEXT}

Your job is to fill the dynamic fields for a marketing visual.

Mode: {context.get("mode")}
Media Type: {context.get("mediaType")}
Media Sub Type: {context.get("subType")}

Business:
{context.get("business")}

Product:
{context.get("product")}

Persona:
{context.get("persona")}

User Request:
{message}

Dynamic Fields:
{field_list}

INSTRUCTIONS:
- Fill the dynamic fields according to the user request
- Use the exact field names provided
- Return ONLY JSON
- Do not include explanations

Example:

{{
"headline": "...",
"caption": "...",
"cta": "...",
"color": "..."
}}
"""

    attempts = len(API_KEYS)
    last_error = None

    for _ in range(attempts):

        api_key = key_manager.get_next_key()

        if not api_key:
            print("⚠️ All keys are in cooldown. Waiting...")
            time.sleep(1)
            continue

        try:
            response = generate_with_key(api_key, prompt)

            if not response or not response.text:
                raise Exception("Empty response")

            data = safe_json_parse(response.text)

            if not isinstance(data, dict):
                raise Exception("Invalid JSON format")

            key_manager.mark_success(api_key)

            return data

        except Exception as e:
            print(f"❌ Key failed: {api_key[:6]}... | Error: {e}")
            key_manager.mark_failed(api_key)
            last_error = e
            continue

    print("🔥 ALL GEMINI KEYS FAILED")
    return {}