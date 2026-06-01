import pandas as pd
from database import get_db
import math
import traceback

# =========================================================
# EXCEL FILE PATH
# =========================================================
EXCEL_FILE = "media_type_excel.xlsx"


# =========================================================
# CLEAN VALUE
# =========================================================
def clean(val):

    if val is None:
        return ""

    if isinstance(val, float) and math.isnan(val):
        return ""

    return str(val).strip()


# =========================================================
# NORMALIZE TEXT
# =========================================================
def normalize(val):

    return clean(val).lower()


# =========================================================
# NORMALIZE VARIABLE NAME
# =========================================================
def normalize_variable(val):

    return (
        clean(val)
        .lower()
        .replace(" ", "")
    )


# =========================================================
# LOAD DATABASE CACHE
# =========================================================
def load_existing(cursor):

    # -----------------------------------------------------
    # MEDIA CACHE
    # -----------------------------------------------------
    cursor.execute("""
        SELECT media_id, media_name
        FROM media
    """)

    media_cache = {
        normalize(name): media_id
        for media_id, name in cursor.fetchall()
    }

    # -----------------------------------------------------
    # MEDIA TYPE CACHE
    # -----------------------------------------------------
    cursor.execute("""
        SELECT media_type_id,
               media_id,
               media_type
        FROM media_type
    """)

    media_type_cache = {
        (
            media_id,
            normalize(media_type)
        ): media_type_id

        for media_type_id,
            media_id,
            media_type

        in cursor.fetchall()
    }

    # -----------------------------------------------------
    # MEDIA SUBTYPE CACHE
    # -----------------------------------------------------
    cursor.execute("""
        SELECT media_subtype_id,
               media_type_id,
               subtype_name
        FROM media_subtype
    """)

    subtype_cache = {
        (
            media_type_id,
            normalize(subtype_name)
        ): media_subtype_id

        for media_subtype_id,
            media_type_id,
            subtype_name

        in cursor.fetchall()
    }

    # -----------------------------------------------------
    # DEFAULT VALUE CACHE
    # -----------------------------------------------------
    cursor.execute("""
        SELECT media_subtype_id,
               variable_name
        FROM media_subtype_default_value
    """)

    value_cache = {
        (
            media_subtype_id,
            normalize_variable(variable_name)
        )

        for media_subtype_id,
            variable_name

        in cursor.fetchall()
    }

    return (
        media_cache,
        media_type_cache,
        subtype_cache,
        value_cache
    )


# =========================================================
# MAIN FUNCTION
# =========================================================
def main():

    try:

        print("\n========================================")
        print("LOADING EXCEL FILE")
        print("========================================\n")

        # -------------------------------------------------
        # READ EXCEL
        # -------------------------------------------------
        df = pd.read_excel(
            EXCEL_FILE,
            dtype=str
        )

        print(f"TOTAL ROWS: {len(df)}")

        # -------------------------------------------------
        # DATABASE CONNECTION
        # -------------------------------------------------
        db = get_db()
        cursor = db.cursor()

        print("\nLOADING DATABASE CACHE...\n")

        (
            media_cache,
            media_type_cache,
            subtype_cache,
            value_cache
        ) = load_existing(cursor)

        # -------------------------------------------------
        # COUNTERS
        # -------------------------------------------------
        inserted = 0
        updated = 0
        skipped = 0
        errors = 0

        # =================================================
        # PROCESS EACH ROW
        # =================================================
        for index, row in df.iterrows():

            try:

                print(
                    f"\n----------------------------------------"
                )

                print(
                    f"PROCESSING ROW: {index + 1}"
                )

                # =========================================
                # READ VALUES
                # =========================================
                media = normalize(
                    row.get("media")
                )

                media_type = normalize(
                    row.get("media_type")
                )

                subtype = clean(
                    row.get("media_subtype")
                )

                subtype_normalized = normalize(
                    subtype
                )

                description = clean(
                    row.get("subtype_description")
                )

                label = clean(
                    row.get("label")
                )

                label_description = clean(
                    row.get("label_description")
                )

                variable = normalize_variable(
                    row.get("label_variablename")
                )

                box_raw = normalize(
                    row.get("box")
                )

                # =========================================
                # VALIDATE BOX
                # =========================================
                if box_raw in ("mandatory", "m"):

                    box = "mandatory"

                elif box_raw in ("optional", "o"):

                    box = "optional"

                else:

                    print(
                        f"❌ INVALID BOX VALUE: {box_raw}"
                    )

                    skipped += 1
                    continue

                # =========================================
                # VALIDATE VARIABLE
                # =========================================
                if variable == "":

                    print(
                        "❌ EMPTY VARIABLE NAME"
                    )

                    skipped += 1
                    continue

                # =========================================
                # MEDIA
                # =========================================
                if media not in media_cache:

                    cursor.execute(
                        """
                        INSERT INTO media
                        (
                            media_name
                        )
                        VALUES (%s)
                        """,
                        (media,)
                    )

                    media_id = cursor.lastrowid

                    media_cache[media] = media_id

                    print(
                        f"✅ CREATED MEDIA: {media}"
                    )

                else:

                    media_id = media_cache[media]

                # =========================================
                # MEDIA TYPE
                # =========================================
                media_type_key = (
                    media_id,
                    media_type
                )

                if media_type_key not in media_type_cache:

                    cursor.execute(
                        """
                        INSERT INTO media_type
                        (
                            media_id,
                            media_type
                        )
                        VALUES (%s, %s)
                        """,
                        (
                            media_id,
                            media_type
                        )
                    )

                    media_type_id = cursor.lastrowid

                    media_type_cache[
                        media_type_key
                    ] = media_type_id

                    print(
                        f"✅ CREATED MEDIA TYPE: "
                        f"{media_type}"
                    )

                else:

                    media_type_id = media_type_cache[
                        media_type_key
                    ]

                # =========================================
                # SUBTYPE
                # =========================================
                subtype_key = (
                    media_type_id,
                    subtype_normalized
                )

                if subtype_key not in subtype_cache:

                    cursor.execute(
                        """
                        INSERT INTO media_subtype
                        (
                            media_type_id,
                            subtype_name,
                            description
                        )
                        VALUES (%s, %s, %s)
                        """,
                        (
                            media_type_id,
                            subtype,
                            description
                        )
                    )

                    media_subtype_id = cursor.lastrowid

                    subtype_cache[
                        subtype_key
                    ] = media_subtype_id

                    print(
                        f"✅ CREATED SUBTYPE: "
                        f"{subtype}"
                    )

                else:

                    media_subtype_id = subtype_cache[
                        subtype_key
                    ]

                # =========================================
                # DEFAULT VALUE
                # =========================================
                value_key = (
                    media_subtype_id,
                    variable
                )

                # =========================================
                # UPDATE EXISTING
                # =========================================
                if value_key in value_cache:

                    cursor.execute(
                        """
                        UPDATE
                            media_subtype_default_value
                        SET
                            box = %s,
                            label = %s,
                            label_description = %s
                        WHERE
                            media_subtype_id = %s
                            AND LOWER(
                                REPLACE(
                                    variable_name,
                                    ' ',
                                    ''
                                )
                            ) = %s
                        """,
                        (
                            box,
                            label,
                            label_description,
                            media_subtype_id,
                            variable
                        )
                    )

                    print(
                        f"🔄 UPDATED: {variable}"
                    )

                    updated += 1

                # =========================================
                # INSERT NEW
                # =========================================
                else:

                    cursor.execute(
                        """
                        INSERT INTO
                        media_subtype_default_value
                        (
                            media_subtype_id,
                            box,
                            label,
                            label_description,
                            variable_name
                        )
                        VALUES
                        (
                            %s,
                            %s,
                            %s,
                            %s,
                            %s
                        )
                        """,
                        (
                            media_subtype_id,
                            box,
                            label,
                            label_description,
                            variable
                        )
                    )

                    value_cache.add(value_key)

                    print(
                        f"✅ INSERTED: {variable}"
                    )

                    inserted += 1

            except Exception as row_error:

                errors += 1

                print(
                    f"\n❌ ERROR IN ROW "
                    f"{index + 1}"
                )

                print(str(row_error))

                traceback.print_exc()

        # =================================================
        # COMMIT CHANGES
        # =================================================
        db.commit()

        # =================================================
        # CLOSE CONNECTION
        # =================================================
        cursor.close()
        db.close()

        # =================================================
        # FINAL SUMMARY
        # =================================================
        print("\n========================================")
        print("IMPORT COMPLETED")
        print("========================================\n")

        print(f"INSERTED : {inserted}")
        print(f"UPDATED  : {updated}")
        print(f"SKIPPED  : {skipped}")
        print(f"ERRORS   : {errors}")

    except Exception as e:

        print("\n========================================")
        print("FATAL ERROR")
        print("========================================\n")

        print(str(e))

        traceback.print_exc()


# =========================================================
# ENTRY POINT
# =========================================================
if __name__ == "__main__":
    main()