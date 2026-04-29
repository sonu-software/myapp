import os
import json
import requests
from dotenv import load_dotenv
from openai import OpenAI

# Load env
load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEYS")
)

OUTPUT_DIR = "generated_images"


# =========================================================
# CREATE OUTPUT FOLDER
# =========================================================
def ensure_dir():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)


# =========================================================
# CLEAN FILE NAME
# =========================================================
def clean_filename(name):
    return "".join(c for c in name if c.isalnum() or c in (" ", "_", "-")).rstrip().replace(" ", "_")


# =========================================================
# JSON → PROMPT STRING
# =========================================================
def json_to_prompt(json_data):
    """
    Convert structured JSON into a strong visual prompt
    """

    prompt = f"""
    Create a high-quality visual.

    Mode: {json_data.get('prompt_information', {}).get('mode')}
    Media Type: {json_data.get('prompt_information', {}).get('media_type')}
    Sub Type: {json_data.get('prompt_information', {}).get('media_sub_type')}
    """

    if "business_information" in json_data:
        prompt += f"\nBrand: {json_data['business_information'].get('business_name', '')}"

    if "product_information" in json_data:
        p = json_data["product_information"]
        prompt += f"\nProduct: {p.get('product_name', '')}"
        prompt += f"\nDescription: {p.get('description', '')}"

    if "creative_context" in json_data:
        prompt += f"\nCreative Direction: {json.dumps(json_data['creative_context'])}"

    prompt += "\nStyle: clean, minimal, modern, high contrast, low text, professional"

    return prompt


# =========================================================
# GENERATE IMAGE
# =========================================================
import base64

def generate_image(prompt, filename):

    ensure_dir()

    response = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size="1024x1024"
    )

    image_data = response.data[0]

    file_path = os.path.join(OUTPUT_DIR, f"{clean_filename(filename)}.png")

    # =========================================================
    # HANDLE BASE64 IMAGE (PRIMARY CASE)
    # =========================================================
    if hasattr(image_data, "b64_json") and image_data.b64_json:

        image_bytes = base64.b64decode(image_data.b64_json)

        with open(file_path, "wb") as f:
            f.write(image_bytes)

        return file_path

    # =========================================================
    # FALLBACK: URL (RARE CASE)
    # =========================================================
    elif hasattr(image_data, "url") and image_data.url:

        img_data = requests.get(image_data.url).content

        with open(file_path, "wb") as f:
            f.write(img_data)

        return file_path

    else:
        raise Exception("No image data returned from OpenAI")