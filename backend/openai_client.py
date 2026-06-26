# openai_client.py

import os
import json
import time
import threading

from dotenv import load_dotenv
from openai import OpenAI

import tempfile
import requests

load_dotenv()


# CONFIG
# ==============================
#MODEL = "gpt-4o-mini"   # fast + cheap (recommended)
MODEL = "gpt-5.4-mini"
KEY_COOLDOWN_SECONDS = 60

SYSTEM_CONTEXT = """
You are an AI assistant inside a Business AI Image Prompt Generator app.

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

    if "```json" in text:
        text = text.split("```json")[1]
        text = text.split("```")[0]

    elif "```" in text:
        text = text.split("```")[1]
        text = text.split("```")[0]

    try:
        return json.loads(text)

    except Exception as e:
        print("JSON PARSE ERROR:", e)
        print("FAILED TEXT:")
        print(text)

        return {}



# OPENAI CALL
# ==============================
def generate_with_key(api_key: str, prompt: str):
    client = OpenAI(api_key=api_key)

    response = client.chat.completions.create(
        model="gpt-5.4-mini",
        messages=[
            {
                "role": "system",
                "content": "You are a professional social media marketing copywriter."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.4,
        max_completion_tokens=3000
    )

    return response.choices[0].message.content



# MAIN FUNCTION (same interface)
# ==============================
def ask_openai(message: str, context: dict) -> dict:

    fields = context.get("fields", [])

    field_list = ""

    example_fields = ""

    for field in fields:

        if isinstance(field, str):

            label = field
            description = ""

        else:

            label = field["label"]
            description = field.get("description", "")

        field_list += f"""
    Field Name: {label}
    Description: {description}

    """

        example_fields += f'      "{label}": "generated value",\n'

    example_fields = example_fields.rstrip(",\n")



    previous_values = context.get("previous_values", {})

    previous_block = "\n".join(
        f"{k}: {v}" for k, v in previous_values.items()
    )

    if not previous_block:
        previous_block = "None"

    prompt = f"""

CRITICAL: Treat the User Request as the sole source of truth. All outputs must directly satisfy the User Request. Any conflicting context must be ignored.
based on the user's request
{message}

Your job is to improve and Generate:
1. Dynamic Fields
2. Summary Context Data

Mode: {context.get("mode")}
Media Type: {context.get("mediaType")}
Media Sub Type: {context.get("subType")}

Media Sub Type Description:
{context.get("subTypeDescription")}


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

Current Summary:
{context.get("summary")}

User Request:
{message}

Dynamic Fields:
{field_list}

PREVIOUSLY GENERATED FIELD VALUES:
{previous_block}

INSTRUCTIONS:
- Strongly use Execute Title, Execute Description, and Visual Elements
- Generate NEW and FRESH values
- DO NOT repeat previous values
- Update Dynamic Fields
- Update Summary
- Use exact field names
- Return ONLY JSON
- No explanations

Return ONLY valid JSON.

Use EXACTLY the same field names provided in Dynamic Fields.

Return JSON in this exact structure:

{{
  "fields": {{
{example_fields}
  }},
  "summary": "generated summary"
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

            print("\n\nRAW GPT RESPONSE:")
            print(text)
            print("\n\n")

            if not text:
                raise Exception("Empty response")

            data = safe_json_parse(text)

            if not isinstance(data, dict):
                raise Exception("Invalid JSON")

            key_manager.mark_success(api_key)
            return {
                "response": data,
                "full_information": prompt
            }

        except Exception as e:
            print(f"❌ Key failed: {api_key[:6]}... | Error: {e}")
            key_manager.mark_failed(api_key)
            last_error = e
            continue

    print("🔥 ALL OPENAI KEYS FAILED")
    return {
        "response": {},
        "full_information": prompt
    }



###################################################################
# =========================================================
# Secind Api Hit to generate description and visual elelmtn
# =========================================================




def enrich_description_and_visuals(
    field_values: dict,
    execute_description: str,
    visual_elements: str
):

    api_key = key_manager.get_next_key()

    client = OpenAI(api_key=api_key)

    prompt = f"""
You are an expert Creative Director.

Your task:

Using ONLY the provided field values,
create a professional Summary.

Rules:

- Use every field value naturally
- Expand into highly detailed professional marketing content
- Create rich storytelling
- Create visual composition details
- Create environment details
- Create lighting details
- Create product placement details
- Create character details if applicable
- Create mood details
- Create color details
- Create camera details
- Create typography guidance

- Structure the content professionally
- Use natural formatting wherever appropriate
- Use paragraphs, sections, bullet points, numbered lists, sub-sections, and spacing whenever they improve readability
- Do NOT force a fixed template or predefined structure
- Let the content naturally decide its structure
- Organize information logically
- Group related concepts together
- Avoid giant blocks of text
- Break large ideas into readable sections
- Make the output look like a professional creative brief written by a senior advertising strategist
- Preserve line breaks and spacing
- Prioritize readability, completeness, and clarity

VERY IMPORTANT:

Do NOT invent new business facts.

Use only information present in:

FIELDS
DESCRIPTION
VISUAL ELEMENTS

FIELDS:
{json.dumps(field_values, indent=2)}

CURRENT DESCRIPTION:
{execute_description}

CURRENT VISUAL ELEMENTS:
{visual_elements}

Create a professional summary using the information above.



Formatting Requirements:

The output must be professionally structured and easy to read.

You may naturally use:
- paragraphs
- bullet points
- numbered lists
- sections
- sub-sections

Use whichever structure best suits the content.

Do NOT force everything into one paragraph.
Do NOT force a rigid template.
Let the information naturally determine the format.

Preserve all line breaks.

Return ONLY JSON:

Return ONLY JSON:

{{
    "summary":"..."
}}
"""

    response = client.chat.completions.create(
        model="gpt-5.4-mini",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": "You are a senior advertising strategist."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.4
    )

    return safe_json_parse(
        response.choices[0].message.content
    )


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
- ALL provided image URLs
- business logo references
- product image references
- brand consistency

IMPORTANT IMAGE HANDLING RULES:
- If logo_url exists, use it as the official brand logo reference
- If product images exist, use them as the exact product appearance reference
- Use the provided image URLs to maintain realistic product consistency
- Ensure the generated creative visually matches the uploaded products
- Use uploaded images as visual guidance for product shape, color, material, branding, and presentation
- Preserve brand identity using the provided reference images
- Do NOT ignore image URLs inside the DATA


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


def generate_professional_image_prompt(final_json: dict,
    execute_title: str = "",
    execute_description: str = "",
    visual_elements: str = "",):

    client = OpenAI(
        api_key=key_manager.get_next_key()
    )

    creative_context = final_json.get("creative_context", {})

    final_json = {
        "creative_context": creative_context
    }

    prompt = f"""
Analyze the following marketing DATA and generate a professional
IMAGE GENERATION PROMPT for a premium promotional visual.

DATA:
{json.dumps(final_json, indent=2)}

Requirements:
- Use the DATA as the primary source of creative direction
- Exactly Use Creative Context for the Creation
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
        model="gpt-5.4-mini",
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
        temperature=0.4
    )

    return response.choices[0].message.content.strip()




#######################################################################################


from openai import OpenAI
import requests
import uuid
import boto3
import os

AWS_REGION = os.getenv("AWS_REGION")
BUCKET_NAME = os.getenv("S3_BUCKET")

s3 = boto3.client(
    "s3",
    region_name=AWS_REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("AWS_SECRET_KEY"),
)

S3_BASE_URL = f"https://{BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com"



def download_reference_image(url):

    if not url:
        return None

    response = requests.get(url, timeout=30)

    response.raise_for_status()

    temp_file = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=os.path.splitext(url)[1] or ".png"
    )

    temp_file.write(response.content)
    temp_file.close()
    print("###############################################################################################################")
    print(temp_file.name)
    print("###############################################################################################################")

    return temp_file.name






def generate_ai_image(
        image_prompt: str,
        logo_url=None,
        product_url=None
    ):

    api_key = key_manager.get_next_key()

    client = OpenAI(api_key=api_key)
    print("START IMAGE GENERATION")
    
    reference_images = []

    logo_file_path = download_reference_image(
        logo_url
    )

    product_file_path = download_reference_image(
        product_url
    )

    if product_file_path:
        reference_images.append(
            open(product_file_path, "rb")
        )

    if logo_file_path:
        reference_images.append(
            open(logo_file_path, "rb")
        )






    if reference_images:

        response = client.images.edit(
            model="gpt-image-2",
            image=reference_images,
            prompt=image_prompt,
            size="1024x1024",
            quality="low"
        )

    else:

        response = client.images.generate(
            model="gpt-image-2",
            prompt=image_prompt,
            size="1024x1024",
            quality="low"
        )

    print("IMAGE GENERATED SUCCESSFULLY")

    # ==========================================
    # GPT IMAGE RETURNS BASE64
    # ==========================================

    import base64

    image_base64 = response.data[0].b64_json

    image_data = base64.b64decode(image_base64)

    # upload to s3
    filename = f"ai-generated/{uuid.uuid4()}.png"

    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=filename,
        Body=image_data,
        ContentType="image/png"
    )

    final_url = f"{S3_BASE_URL}/{filename}"

    return final_url


     



# =========================================================
# AI CAPTION GENERATION
# =========================================================

def generate_visual_caption(prompt_data):

    import json

    api_key = key_manager.get_next_key()

    client = OpenAI(api_key=api_key)

    prompt = f"""
Generate a professional social media caption.

Requirements:
- Engaging marketing tone
- Include emojis
- Include hashtags
- Short and modern
- Maximum 300 words
- No markdown

Context:
{json.dumps(prompt_data, indent=2)}
"""

    response = client.chat.completions.create(
        model="gpt-5.4-mini",
        messages=[
            {
                "role": "system",
                "content": "You are a professional social media marketing copywriter."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.4,
        max_completion_tokens=800
    )

    return response.choices[0].message.content.strip()
