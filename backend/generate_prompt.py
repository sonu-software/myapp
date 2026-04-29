import pandas as pd
import json
from datetime import datetime, date

from database import get_db
from openai_client import ask_openai
from image_generator import generate_image, json_to_prompt


REQUIRED_COLUMNS = [
    "business_id",
    "persona_id",
    "product_id",
    "mode",
    "media_type",
    "media_subtype",
    "execute_title"
]


# =========================================================
# 🔥 FIX 1: JSON SAFE CONVERTER
# =========================================================

def clean_data(data):
    if isinstance(data, dict):
        return {k: clean_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [clean_data(v) for v in data]
    elif isinstance(data, (datetime, date)):
        return data.isoformat()
    return data


# =========================================================
# EXACT BACKEND LOGIC
# =========================================================

def resolve_media_subtype(cursor, mode, media_type, sub_type):

    cursor.execute("SELECT media_id FROM media WHERE media_name = %s", (mode,))
    media = cursor.fetchone()
    if not media:
        raise Exception(f"Invalid mode: {mode}")

    cursor.execute(
        "SELECT media_type_id FROM media_type WHERE media_id=%s AND media_type=%s",
        (media["media_id"], media_type)
    )
    mt = cursor.fetchone()
    if not mt:
        raise Exception(f"Invalid media_type: {media_type}")

    cursor.execute(
        "SELECT media_subtype_id FROM media_subtype WHERE media_type_id=%s AND subtype_name=%s",
        (mt["media_type_id"], sub_type)
    )
    ms = cursor.fetchone()
    if not ms:
        raise Exception(f"Invalid media_subtype: {sub_type}")

    return ms["media_subtype_id"]


# =========================================================
# FETCH FIELD DEFINITIONS
# =========================================================

def get_fields(cursor, media_subtype_id):

    cursor.execute("""
        SELECT label, variable_name, box
        FROM media_subtype_default_value
        WHERE media_subtype_id=%s
        ORDER BY default_value_id
    """, (media_subtype_id,))

    rows = cursor.fetchall()

    mandatory = [r["variable_name"] for r in rows if r["box"] == "mandatory"]
    optional  = [r["variable_name"] for r in rows if r["box"] == "optional"]

    return mandatory, optional


# =========================================================
# FETCH BUSINESS / PRODUCT / PERSONA
# =========================================================

def get_business(cursor, business_id):
    cursor.execute("SELECT * FROM businesses WHERE business_id=%s", (business_id,))
    return cursor.fetchone()


def get_persona(cursor, persona_id):
    cursor.execute("SELECT * FROM personas WHERE persona_id=%s", (persona_id,))
    persona = cursor.fetchone()

    cursor.execute("""
        SELECT segment_type, label, value, is_active
        FROM persona_segments
        WHERE persona_id=%s
    """, (persona_id,))
    persona["segments"] = cursor.fetchall()

    return persona


def get_product(cursor, product_id):

    cursor.execute("SELECT * FROM products WHERE product_id=%s", (product_id,))
    product = cursor.fetchone()

    hashtags = json.loads(product["hashtags"]) if product.get("hashtags") else []

    cursor.execute("SELECT feature_text FROM product_features WHERE product_id=%s", (product_id,))
    features = [r["feature_text"] for r in cursor.fetchall()]

    cursor.execute("SELECT usp_text FROM product_usps WHERE product_id=%s", (product_id,))
    usps = [r["usp_text"] for r in cursor.fetchall()]

    cursor.execute("SELECT value_text FROM product_values WHERE product_id=%s", (product_id,))
    values = [r["value_text"] for r in cursor.fetchall()]

    cursor.execute("SELECT img_url FROM product_images WHERE product_id=%s", (product_id,))
    images = [r["img_url"] for r in cursor.fetchall()]

    return {
        "product_name": product["product_name"],
        "description": product["product_description"],
        "features": features,
        "USP": usps,
        "values": values,
        "images": images,
        "hashtags": hashtags   # ✅ FIX
    }


# =========================================================
# GENERATE FIELD VALUES (FIXED)
# =========================================================

def generate_fields(row, fields, business, product, persona):

    if not fields:
        return {}

    return ask_openai(
        message=row["execute_title"],
        context={
            "mode": row["mode"],
            "mediaType": row["media_type"],
            "subType": row["media_subtype"],
            "business": json.dumps(clean_data(business)),
            "product": json.dumps(clean_data(product)),
            "persona": json.dumps(clean_data(persona)),
            "fields": fields,
            "previous_values": {}
        }
    )


# =========================================================
# FINAL JSON
# =========================================================

def build_final_json(row, business, product, persona, field_values):

    # ===============================
    # 1. BUSINESS (FILTER EMPTY)
    # ===============================
    business_clean = {
        k: v for k, v in business.items()
        if v not in [None, "", [], {}]
    }

    # ===============================
    # 2. PERSONA (STRUCTURED)
    # ===============================
    persona_structured = None

    if persona:
        segments_grouped = {}

        for seg in persona.get("segments", []):
            if not seg.get("is_active"):
                continue

            seg_type = seg["segment_type"]

            key = seg["label"].lower().replace(" ", "_")
            key = "".join(c for c in key if c.isalnum() or c == "_")

            if seg_type not in segments_grouped:
                segments_grouped[seg_type] = {}

            segments_grouped[seg_type][key] = seg["value"]

        persona_structured = {
            "persona_name": persona.get("persona_name"),
            "segments": segments_grouped,
            "hashtags": persona.get("hashtags", [])
        }

    # ===============================
    # 3. PRODUCT (MATCH FRONTEND)
    # ===============================
    product_structured = None

    if product:
        product_structured = {
            "product_name": product.get("product_name"),
            "description": product.get("description"),
            "hashtags": product.get("hashtags", [])
        }

        if product.get("features"):
            product_structured["features"] = product["features"]

        if product.get("USP"):
            product_structured["USP"] = product["USP"]

        if product.get("values"):
            product_structured["values"] = product["values"]

        if product.get("images"):
            product_structured["images"] = product["images"]

    # ===============================
    # 4. CREATIVE CONTEXT (ONLY ENABLED + FILLED)
    # ===============================
    creative_context = {
        k: v for k, v in field_values.items()
        if v and str(v).strip()
    }

    # ===============================
    # FINAL OUTPUT
    # ===============================
    final = {
        "prompt_information": {
            "mode": row["mode"],
            "media_type": row["media_type"],
            "media_sub_type": row["media_subtype"]
        }
    }

    if business_clean:
        final["business_information"] = business_clean

    if persona_structured:
        final["persona_information"] = persona_structured

    if product_structured:
        final["product_information"] = product_structured

    if creative_context:
        final["creative_context"] = creative_context

    return final

# =========================================================
# MAIN
# =========================================================

def process_file(input_file, output_file):

    df = pd.read_excel(input_file)

    db = get_db()
    cursor = db.cursor(dictionary=True)

    results = []

    for _, row in df.iterrows():

        try:
            # STEP 1
            subtype_id = resolve_media_subtype(
                cursor,
                row["mode"],
                row["media_type"],
                row["media_subtype"]
            )

            # STEP 2
            mandatory, optional = get_fields(cursor, subtype_id)

            # STEP 3
            business = clean_data(get_business(cursor, row["business_id"]))
            product  = clean_data(get_product(cursor, row["product_id"]))
            persona  = clean_data(get_persona(cursor, row["persona_id"]))

            # STEP 4
            field_values = generate_fields(
                row,
                mandatory + optional,
                business,
                product,
                persona
            )

            # STEP 5
            final_json = build_final_json(
                row,
                business,
                product,
                persona,
                field_values
            )

            # Convert JSON → prompt
            image_prompt = json_to_prompt(final_json)

            # Generate image
            file_name = clean_data(row["execute_title"])
            image_path = generate_image(image_prompt, file_name)

            # Save both JSON + image path
            results.append(json.dumps(final_json, indent=2))

        except Exception as e:
            results.append(f"ERROR: {str(e)}")

    df["output_prompt"] = results
    df.to_excel(output_file, index=False)

    print("✅ Done")


# =========================================================
# RUN 
# =========================================================

if __name__ == "__main__":
    process_file("input.xlsx", "output.xlsx")