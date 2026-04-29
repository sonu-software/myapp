import pandas as pd
from database import get_db
import math

EXCEL_FILE = r"D:\media_subtype_default_values.xlsx"


# -------------------------------
# SAFE VALUE READER
# -------------------------------
def clean(val):

    if val is None:
        return ""

    if isinstance(val, float) and math.isnan(val):
        return ""

    return str(val).strip()


# -------------------------------
# LOAD DB CACHE
# -------------------------------
def load_existing(cursor):

    cursor.execute("SELECT media_id, media_name FROM media")
    media_cache = {name: mid for mid, name in cursor.fetchall()}

    cursor.execute("""
        SELECT media_type_id, media_id, media_type
        FROM media_type
    """)
    media_type_cache = {(mid, mtype): mtid for mtid, mid, mtype in cursor.fetchall()}

    cursor.execute("""
        SELECT media_subtype_id, media_type_id, subtype_name
        FROM media_subtype
    """)
    subtype_cache = {(mtid, name.lower()): sid for sid, mtid, name in cursor.fetchall()}

    cursor.execute("""
        SELECT media_subtype_id, variable_name
        FROM media_subtype_default_value
    """)
    value_cache = set(cursor.fetchall())

    return media_cache, media_type_cache, subtype_cache, value_cache


# -------------------------------
# MAIN IMPORT
# -------------------------------
def main():

    print("Loading Excel...")

    df = pd.read_excel(EXCEL_FILE, dtype=str)

    db = get_db()
    cursor = db.cursor()

    print("Loading database caches...")

    media_cache, media_type_cache, subtype_cache, value_cache = load_existing(cursor)

    inserted = 0
    skipped = 0

    for _, row in df.iterrows():

        media = clean(row.get("media"))
        media_type = clean(row.get("media_type"))
        subtype = clean(row.get("media_subtype"))
        description = clean(row.get("subtype_description"))

        label = clean(row.get("label"))
        variable = clean(row.get("label_variablename"))

        box_raw = clean(row.get("box")).lower()

        if box_raw in ("mandatory", "m"):
            box = "mandatory"
        elif box_raw in ("optional", "o"):
            box = "optional"
        else:
            print(f"⚠ Invalid box value '{box_raw}', skipping row")
            skipped += 1
            continue

        # skip empty variable rows
        if variable == "":
            skipped += 1
            continue

        # ---------------- MEDIA
        if media not in media_cache:

            cursor.execute(
                "INSERT INTO media (media_name) VALUES (%s)",
                (media,)
            )

            media_id = cursor.lastrowid
            media_cache[media] = media_id

        else:
            media_id = media_cache[media]

        # ---------------- MEDIA TYPE
        key = (media_id, media_type)

        if key not in media_type_cache:

            cursor.execute(
                """
                INSERT INTO media_type
                (media_id, media_type)
                VALUES (%s,%s)
                """,
                (media_id, media_type)
            )

            media_type_id = cursor.lastrowid
            media_type_cache[key] = media_type_id

        else:
            media_type_id = media_type_cache[key]

        # ---------------- SUBTYPE
        subtype_key = (media_type_id, subtype)

        if subtype_key not in subtype_cache:

            cursor.execute(
                """
                INSERT INTO media_subtype
                (media_type_id, subtype_name, description)
                VALUES (%s,%s,%s)
                """,
                (media_type_id, subtype, description)
            )

            media_subtype_id = cursor.lastrowid
            subtype_cache[subtype_key] = media_subtype_id

        else:
            media_subtype_id = subtype_cache[subtype_key]

        # ---------------- DEFAULT VALUE
        value_key = (media_subtype_id, variable)

        if value_key in value_cache:

            skipped += 1
            continue

        cursor.execute(
            """
            INSERT INTO media_subtype_default_value
            (media_subtype_id, box, label, variable_name)
            VALUES (%s,%s,%s,%s)
            """,
            (
                media_subtype_id,
                box,
                label,
                variable
            )
        )

        value_cache.add(value_key)

        inserted += 1

    db.commit()

    cursor.close()
    db.close()

    print("\n----------- IMPORT COMPLETE -----------")
    print("Inserted:", inserted)
    print("Skipped:", skipped)


if __name__ == "__main__":
    main()