# openai_client.py

import os
import json
import time
import threading

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


# CONFIG
# ==============================
#MODEL = "gpt-4o-mini"   # fast + cheap (recommended)
MODEL = "gpt-4o"
KEY_COOLDOWN_SECONDS = 60

SYSTEM_CONTEXT = """
You are an AI assistant inside a Business AI Prompt Generator app.

Your responsibilities:
- Help users understand and improve AI prompts
- Answer questions related to visuals, marketing messages, branding
- Give clear, structured, practical answers
- Stay aligned with the selected mode and business context
- Do NOT generate irrelevant content
"""


# LOAD API KEYS
# ==============================
raw_keys = os.getenv("OPENAI_API_KEYS", "")

API_KEYS = [
    key.strip().replace('"', '').replace("'", "")
    for key in raw_keys.split(",")
    if key.strip()
]

if not API_KEYS:
    raise Exception("❌ No OpenAI API keys found in .env")



# KEY MANAGER (same logic reused)
# ==============================
class OpenAIKeyManager:
    def __init__(self, keys):
        self.keys = keys
        self.index = 0
        self.lock = threading.Lock()
        self.failed_keys = {}

    def get_next_key(self):
        with self.lock:
            total = len(self.keys)

            for _ in range(total):
                key = self.keys[self.index]
                self.index = (self.index + 1) % total

                if key in self.failed_keys:
                    last_failed = self.failed_keys[key]
                    if time.time() - last_failed < KEY_COOLDOWN_SECONDS:
                        continue

                return key

            return None

    def mark_failed(self, key):
        self.failed_keys[key] = time.time()

    def mark_success(self, key):
        if key in self.failed_keys:
            del self.failed_keys[key]


key_manager = OpenAIKeyManager(API_KEYS)



# SAFE JSON PARSER (same)
# ==============================
def safe_json_parse(text: str) -> dict:
    text = text.strip()

    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(text)
    except Exception:
        return {}



# OPENAI CALL
# ==============================
def generate_with_key(api_key: str, prompt: str):
    client = OpenAI(api_key=api_key)

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_CONTEXT},
            {"role": "user", "content": prompt}
        ],
        temperature=0.9
    )

    return response.choices[0].message.content



# MAIN FUNCTION (same interface)
# ==============================
def ask_openai(message: str, context: dict) -> dict:

    fields = context.get("fields", [])
    field_list = "\n".join(fields)

    previous_values = context.get("previous_values", {})

    previous_block = "\n".join(
        f"{k}: {v}" for k, v in previous_values.items()
    )

    if not previous_block:
        previous_block = "None"

    prompt = f"""
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

Execute Title:
{context.get("execute_title")}

Execute Description:
{context.get("execute_description")}

Visual Elements to Show:
{context.get("visual_elements")}

User Request:
{message}

Dynamic Fields:
{field_list}

PREVIOUSLY GENERATED FIELD VALUES:
{previous_block}

INSTRUCTIONS:
- Strongly use Execute Title, Execute Description, and Visual Elements
- Generate NEW and FRESH values
- DO NOT repeat or slightly modify previous values
- Ensure outputs are clearly different from previous ones
- Fill all fields
- Use exact field names
- Return ONLY JSON
- No explanations

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
            print("⚠️ All keys in cooldown. Waiting...")
            time.sleep(1)
            continue

        try:
            text = generate_with_key(api_key, prompt)

            if not text:
                raise Exception("Empty response")

            data = safe_json_parse(text)

            if not isinstance(data, dict):
                raise Exception("Invalid JSON")

            key_manager.mark_success(api_key)
            return data

        except Exception as e:
            print(f"❌ Key failed: {api_key[:6]}... | Error: {e}")
            key_manager.mark_failed(api_key)
            last_error = e
            continue

    print("🔥 ALL OPENAI KEYS FAILED")
    return {}






###################################################################
# =========================================================
# PROFESSIONAL IMAGE PROMPT GENERATOR
# =========================================================

IMAGE_PROMPT_SYSTEM = """
You are a world-class AI Creative Director specializing in premium commercial advertising visuals.

Your task:
Transform structured business, product, persona, and marketing JSON into a HIGH-QUALITY IMAGE GENERATION PROMPT for promotional creatives.

Focus heavily on:
- the actual DATA provided
- product positioning
- target audience psychology
- business branding
- marketing intent
- media type and media subtype
- visual storytelling

The generated prompt should naturally create:
- premium social media advertisements
- modern promotional posters
- commercial marketing creatives
- LinkedIn, Instagram, and Facebook ad visuals

Guidelines:
- Keep the prompt visually descriptive and commercially realistic
- Make the product/service the primary hero focus
- Maintain clean premium composition
- Include cinematic lighting, depth, and realistic advertising aesthetics
- Ensure modern typography placement and CTA-friendly layout
- Avoid excessive instructions or repetitive design directives
- Let the DATA drive the creative direction

Visual Style Expectations:
- premium
- modern
- luxury commercial aesthetic
- scroll-stopping
- highly realistic
- ad-agency quality
- cinematic
- polished branding

The output should feel like a professionally art-directed advertising campaign visual.

RETURN ONLY THE FINAL IMAGE PROMPT.
NO JSON.
NO MARKDOWN.
NO EXPLANATION.
"""


def generate_professional_image_prompt(final_json: dict):

    client = OpenAI(
        api_key=key_manager.get_next_key()
    )

    prompt = f"""
Analyze the following marketing DATA and generate a professional
IMAGE GENERATION PROMPT for a premium promotional visual.

DATA:
{json.dumps(final_json, indent=2)}

Requirements:
- Use the DATA as the primary source of creative direction
- Exactly Use Creative Context for the Creation
- Exactly use the Persona for the Environment Creation
- Exactly Use the Product to showcase of Product or Solution or Service
- Understand the business, audience, product, and marketing purpose
- Strictly Adapt the visual style according to MediaType and MediaSubtype
- Create a realistic commercial advertising scene
- Ensure strong visual hierarchy and premium composition
- Keep space for headline, branding, and CTA placement
- Use modern advertising aesthetics and cinematic realism
- Make the output suitable for high-end social media marketing

The generated prompt should feel like a professionally designed:
- LinkedIn ad creative
- Instagram promotional campaign
- commercial marketing banner
- premium advertising poster

Include:
- realistic environment direction
- product presentation guidance
- lighting and mood
- typography placement guidance
- composition direction
- branding feel
- premium commercial styling

Mention:
- ultra realistic
- 8K quality
- cinematic lighting
- advertising composition
- modern commercial visual styling

Generate ONLY the final image generation prompt.
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": IMAGE_PROMPT_SYSTEM
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.9
    )

    return response.choices[0].message.content.strip()