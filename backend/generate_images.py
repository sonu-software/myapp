"""
Batch Image Generator using OpenAI GPT-Image-1
------------------------------------------------

FEATURES:
- Reads Excel file with 2 columns
- Injects values into hardcoded prompt
- Uses logo.png as branding reference image
- Generates images one by one
- Automatic retry on failures
- Resume-safe (skips existing images)
- Saves images as:
    column1_column2.png

REQUIRED:
pip install openai pandas openpyxl pillow

ENV VARIABLE:
OPENAI_API_KEYS=your_api_key

FILES REQUIRED:
- input_utkarsh.xlsx
- logo.png

EXCEL FORMAT:
------------------------------------------------
| column_1                  | column_2          |
------------------------------------------------
| Object Detection          | Healthcare        |
| Defect Detection          | Manufacturing     |
------------------------------------------------
"""

import os
import re
import time
import base64
import pandas as pd

from io import BytesIO
from PIL import Image
from openai import OpenAI

# =========================================================
# CONFIG
# =========================================================

EXCEL_FILE = "input_utkarsh.xlsx"

OUTPUT_DIR = "generated_images_utkarsh"

LOGO_FILE = "logo.png"

MODEL_NAME = "gpt-image-2"

IMAGE_SIZE = "1024x1024"

MAX_RETRIES = 5
RETRY_DELAY = 10

# =========================================================
# OPENAI CLIENT
# =========================================================

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEYS")
)

# =========================================================
# CREATE OUTPUT DIRECTORY
# =========================================================

os.makedirs(OUTPUT_DIR, exist_ok=True)

# =========================================================
# VALIDATE LOGO FILE
# =========================================================

if not os.path.exists(LOGO_FILE):
    raise FileNotFoundError(
        f"\n❌ Logo file not found: {LOGO_FILE}"
    )

# =========================================================
# PROMPT TEMPLATE
# =========================================================

PROMPT_TEMPLATE = r"""
# MASTER GENERIC PROMPT — LIGHT THEMED AI SERVICE VISUAL

Create a high-end futuristic cinematic promotional visual for:

Topic: "{column_1}"  
Sub-topic: "{column_2}"

---

## Output Settings
- Square format (1:1 ratio)
- Optimized for:
  - 720x720
  - 480x480
- Designed for small-size visibility
- Minimal clutter
- Strong focal hierarchy
- Clean premium composition

---

## Branding
Include only:
- "Visual Grab"
- "Computer Vision and AI Services"

Use subtle minimal branding in the top-left corner.

---

## Text Rules
Only display:
- Company name
- Tagline
- Topic name
- Sub-topic name

No:
- paragraphs
- feature lists
- descriptions
- infographic sections
- excessive UI text

---

## Visual Style
- Light themed futuristic environment
- Premium white/silver/soft-gray aesthetics
- Soft blue AI glow accents
- Hyper realistic
- Cinematic lighting
- Enterprise AI branding style
- Modern industrial-tech atmosphere
- Minimal but visually powerful

---

## Composition
- Main object centered prominently
- Futuristic AI/computer vision scanner above the object
- Holographic overlays and minimal floating UI
- Strong depth and perspective
- Soft environmental blur
- Realistic reflections and metallic textures

---

## Scene Setup
Place the object naturally in an industry-relevant environment such as:
- smart factory
- conveyor system
- warehouse
- transportation setup
- futuristic workspace
- healthcare setup

Add:
- AI scanning beam
- minimal holographic visuals
- right-side visual indicators:
  - red anomaly
  - orange warning
  - green success

Use visuals over text explanations.

---

## Quality
- Ultra detailed
- photorealistic
- cinematic
- premium commercial quality
- optimized for social media and LinkedIn
- clean futuristic AI marketing visual
"""

# =========================================================
# HELPERS
# =========================================================

def sanitize_filename(text):
    """
    Clean filename
    """

    text = str(text).strip().replace(" ", "_")

    text = re.sub(
        r'[\\/*?:"<>|]',
        "",
        text
    )

    return text


def generate_prompt(column_1, column_2):
    """
    Fill prompt template
    """

    return PROMPT_TEMPLATE.format(
        column_1=column_1,
        column_2=column_2
    )


def save_image_from_base64(
    b64_data,
    save_path
):
    """
    Decode and save image
    """

    image_bytes = base64.b64decode(b64_data)

    image = Image.open(
        BytesIO(image_bytes)
    )

    image.save(save_path)

# =========================================================
# LOAD EXCEL
# =========================================================

try:

    df = pd.read_excel(EXCEL_FILE)

except Exception as e:

    print(
        f"\n❌ Failed to read Excel file:\n{e}"
    )

    raise

# =========================================================
# VALIDATE COLUMNS
# =========================================================

required_columns = [
    "column_1",
    "column_2"
]

for col in required_columns:

    if col not in df.columns:

        raise ValueError(
            f"\n❌ Missing required column: {col}"
        )

# =========================================================
# START
# =========================================================

total_rows = len(df)

print(
    f"\n🚀 Starting generation for "
    f"{total_rows} rows...\n"
)

# =========================================================
# MAIN LOOP
# =========================================================

for index, row in df.iterrows():

    column_1 = str(
        row["column_1"]
    ).strip()

    column_2 = str(
        row["column_2"]
    ).strip()

    # =====================================================
    # FILE NAME
    # =====================================================

    filename = (
        f"{sanitize_filename(column_1)}_"
        f"{sanitize_filename(column_2)}.png"
    )

    save_path = os.path.join(
        OUTPUT_DIR,
        filename
    )

    # =====================================================
    # SKIP EXISTING
    # =====================================================

    if os.path.exists(save_path):

        print(
            f"⏭️ Skipping existing: {filename}"
        )

        continue

    # =====================================================
    # GENERATE PROMPT
    # =====================================================

    prompt = generate_prompt(
        column_1,
        column_2
    )

    print(
        f"\n🖼️ Generating "
        f"({index + 1}/{total_rows})"
    )

    print(f"Topic: {column_1}")
    print(f"Sub-topic: {column_2}")

    success = False

    # =====================================================
    # RETRY LOOP
    # =====================================================

    for attempt in range(
        1,
        MAX_RETRIES + 1
    ):

        try:

            print(
                f"   Attempt "
                f"{attempt}/{MAX_RETRIES}"
            )

            # =============================================
            # IMAGE GENERATION WITH LOGO INPUT
            # =============================================

            with open(LOGO_FILE, "rb") as logo_file:

                response = client.images.edit(
                    model=MODEL_NAME,

                    image=[
                        logo_file
                    ],

                    prompt=prompt,

                    size=IMAGE_SIZE
                )

            # =============================================
            # EXTRACT IMAGE
            # =============================================

            image_b64 = response.data[0].b64_json

            # =============================================
            # SAVE IMAGE
            # =============================================

            save_image_from_base64(
                image_b64,
                save_path
            )

            print(
                f"   ✅ Saved: {filename}"
            )

            success = True

            break

        except Exception as e:

            print(f"   ❌ Error: {e}")

            if attempt < MAX_RETRIES:

                print(
                    f"   🔄 Retrying in "
                    f"{RETRY_DELAY} seconds..."
                )

                time.sleep(RETRY_DELAY)

    # =====================================================
    # FAILED
    # =====================================================

    if not success:

        print(
            f"\n❌ FAILED permanently:\n"
            f"{column_1} | {column_2}\n"
        )

# =========================================================
# END
# =========================================================

print("\n🎉 ALL TASKS COMPLETED\n")