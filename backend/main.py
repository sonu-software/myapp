# =============================================================================
#  main.py  —  Elevantia PACE  |  FastAPI Backend
#  Enhanced: clean imports, no duplicate queries, batch inserts (executemany),
#  proper rollbacks, consistent error handling, helper functions deduplicated.
# =============================================================================

# ── Standard library ──────────────────────────────────────────────────────────
import json
import os
import uuid
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional
import requests

# ── Third-party ───────────────────────────────────────────────────────────────
import boto3
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from mysql.connector import IntegrityError
from pydantic import BaseModel

# ── Internal modules ──────────────────────────────────────────────────────────
from auth import create_token, get_current_user, hash_password, verify_password
from business_rules import get_categories, get_subcategories
from database import get_db
from openai_client import (ask_openai,enrich_description_and_visuals,generate_professional_image_prompt,generate_ai_image, generate_visual_caption)
from otp_service import generate_otp, send_otp_email
from prompts import build_prompt
from subcategory_rules import SUBCATEGORY_RULES  # available for future use

# ── Environment ───────────────────────────────────────────────────────────────
load_dotenv()



LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID")
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET")
LINKEDIN_REDIRECT_URI = os.getenv("LINKEDIN_REDIRECT_URI")
AWS_REGION = os.getenv("AWS_REGION")

# ── AWS S3 client ─────────────────────────────────────────────────────────────
s3 = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("AWS_SECRET_KEY"),
)
BUCKET_NAME = os.getenv("S3_BUCKET")
S3_BASE_URL = f"https://{BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com"

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="Elevantia PACE API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
#  SHARED HELPERS
# =============================================================================

BUSINESS_EXCLUDED_FIELDS = {
    "business_id", "profile_id", "terms_accepted",
    "privacy_accepted", "created_at", "updated_at", "is_completed",
}


def _clean_business(row: dict) -> dict:
    """Strip internal fields and None/empty values from a business row."""
    return {k: v for k, v in row.items()
            if k not in BUSINESS_EXCLUDED_FIELDS and v not in (None, "")}


def require_business(user_id: int, db) -> int:
    """
    Return business_id for the given user.
    Raises HTTP 400 BUSINESS_REQUIRED if none exists.
    """
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT b.business_id
            FROM businesses b
            JOIN profiles p ON b.profile_id = p.profile_id
            WHERE p.user_id = %s
            """,
            (user_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="BUSINESS_REQUIRED")
        return row["business_id"]
    finally:
        cursor.close()


def require_business_for_network_user(user_id: int, db) -> int:

    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT primary_user_id
            FROM network
            WHERE secondary_user_id = %s
            LIMIT 1
            """,
            (user_id,)
        )

        network_row = cursor.fetchone()

        owner_user_id = (
            network_row["primary_user_id"]
            if network_row
            else user_id
        )

        cursor.execute(
            """
            SELECT b.business_id
            FROM businesses b
            JOIN profiles p
                ON b.profile_id = p.profile_id
            WHERE p.user_id = %s
            """,
            (owner_user_id,)
        )

        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=400,
                detail="BUSINESS_REQUIRED"
            )

        return row["business_id"]

    finally:
        cursor.close()








def resolve_media_subtype(cursor, mode: str, media_type: str, sub_type: str):
    """
    Walk media → media_type → media_subtype in a single helper.
    Returns (media_id, media_type_id, media_subtype_id) or raises HTTP 400.
    """
    cursor.execute("SELECT media_id FROM media WHERE media_name = %s", (mode,))
    media = cursor.fetchone()
    if not media:
        raise HTTPException(400, "Invalid mode")

    cursor.execute(
        "SELECT media_type_id FROM media_type WHERE media_id=%s AND media_type=%s",
        (media["media_id"], media_type),
    )
    mt = cursor.fetchone()
    if not mt:
        raise HTTPException(400, "Invalid mediaType")

    cursor.execute(
        "SELECT media_subtype_id FROM media_subtype WHERE media_type_id=%s AND subtype_name=%s",
        (mt["media_type_id"], sub_type),
    )
    ms = cursor.fetchone()
    if not ms:
        raise HTTPException(400, "Invalid subType")

    return media["media_id"], mt["media_type_id"], ms["media_subtype_id"]


# =============================================================================
#  PYDANTIC MODELS
# =============================================================================

class SignupRequest(BaseModel):
    email: str
    mobile: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class VerifyOtpRequest(BaseModel):
    email: str
    otp: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str


class AddSecondaryUserRequest(BaseModel):
    email: str


class BusinessSetupRequest(BaseModel):
    business_name: str
    business_type: Optional[str] = None
    industry: Optional[str] = None
    year_established: Optional[int] = None
    description: Optional[str] = None
    description_file_url: Optional[str] = None
    logo_placement: Optional[str] = None
    owner_name: str
    email: str
    phone: str
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    brand_color: Optional[str] = None

    tagline: Optional[str] = None
    hashtags: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str
    postal_code: Optional[str] = None
    registration_number: Optional[str] = None
    tax_id: Optional[str] = None
    default_currency: Optional[str] = None
    timezone: Optional[str] = None
    fiscal_year_start: Optional[str] = None
    language_preference: Optional[str] = None
    notification_preference: Optional[str] = None
    terms_accepted: bool
    privacy_accepted: bool


class PersonaSegment(BaseModel):
    segment_type: str
    label: str
    value: str
    is_active: bool


class CreatePersonaRequest(BaseModel):
    persona_id: Optional[int] = None
    persona_name: str
    hashtags: List[str] = []
    segments: List[PersonaSegment]


class CreateProductRequest(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    product_description: str
    features: List[str]
    usps: List[str]
    values: List[str]
    images: List[dict]
    hashtags: List[str] = []


class GenerateRequest(BaseModel):
    docket_id: int
    mode: str
    mediaType: str
    subType: str
    name: str
    category: str
    customCategory: Optional[str] = ""
    subCategory: str
    product: Optional[str] = ""
    persona: str
    imageType: str
    imageStyle: str
    dynamicFields: Dict[str, str]
    
    selected_logo: str | None = None

    selected_product_image: str | None = None


class ChatRequest(BaseModel):
    docket_id: int
    message: str
    mode: Optional[str] = ""
    mediaType: Optional[str] = ""
    subType: Optional[str] = ""
    business: Optional[str] = ""
    product: Optional[str] = ""
    persona: Optional[str] = ""

    execute_title: Optional[str] = ""
    execute_description: Optional[str] = ""
    visual_elements: Optional[str] = ""
    summary: Optional[str] = ""

    fields: Optional[List[str]] = []


class CreateDocketRequest(BaseModel):
    title: str
    tab: str
    occasion_id: Optional[int] = None
    product_id: Optional[int] = None
    persona_id: Optional[int] = None
    mode: str
    mediaType: str
    subType: str
    planner_date_time: datetime
    uploaded_date_time: Optional[datetime] = None
    execute_description: Optional[str] = ""
    visual_elements: Optional[str] = ""
    summary: str = ""


class AssignExecuteRequest(BaseModel):
    docket_id: int
    user_id: int
    stage: str


class CreateOccasionRequest(BaseModel):
    title: str
    occasion_date: date
    description: Optional[str] = None
    color: Optional[str] = "#e74c3c"


class UpdateOccasionRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class FieldValueItem(BaseModel):
    label: str
    value: str
    checkbox_clicked: int
    box: str
    field_source: str


class SaveFieldValuesRequest(BaseModel):
    fields: List[FieldValueItem]



class CreateSubtypeLabel(BaseModel):
    label: str
    description: str = ""


class CreateMediaSubtypeRequest(BaseModel):
    mode: str
    media_type: str
    subtype: str
    description: str = ""
    labels: List[CreateSubtypeLabel]




class UpdateDocketRequest(BaseModel):
    title: str

    product_id: Optional[int] = None
    persona_id: Optional[int] = None
    occasion_id: Optional[int] = None

    uploaded_date_time: Optional[datetime] = None

    execute_description: str
    visual_elements: str
    summary: str



class UploadVisualRequest(BaseModel):
    uploaded_url: str
    message: Optional[str] = None


class UpdateVisualMessageRequest(BaseModel):
    message: str


class FeedbackRequest(BaseModel):
    docket_id: int
    admin_media_id: int
    feedback: str


# =============================================================================
#  AUTH  —  signup / OTP / login / forgot-password
# =============================================================================

@app.post("/send-otp")
def send_otp_api(req: SignupRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT user_id FROM users WHERE email=%s", (req.email,))
        if cursor.fetchone():
            raise HTTPException(400, "Email already exists")

        otp = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=5)
        hashed = hash_password(req.password)

        cursor.execute("DELETE FROM signup_otp WHERE email=%s", (req.email,))
        cursor.execute(
            "INSERT INTO signup_otp (email, mobile, password_hash, otp, expires_at) VALUES (%s,%s,%s,%s,%s)",
            (req.email, req.mobile, hashed, otp, expires_at),
        )
        db.commit()
        send_otp_email(req.email, otp)
        return {"success": True, "message": "OTP sent"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("SEND-OTP ERROR:", e)
        raise HTTPException(500, "Failed to send OTP")
    finally:
        cursor.close()
        db.close()


@app.post("/verify-otp")
def verify_otp_api(req: VerifyOtpRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM signup_otp WHERE email=%s AND otp=%s",
            (req.email, req.otp),
        )
        record = cursor.fetchone()
        if not record:
            raise HTTPException(400, "Invalid OTP")
        if datetime.utcnow() > record["expires_at"]:
            raise HTTPException(400, "OTP expired")

        cursor.execute(
            "INSERT INTO users (email, mobile, password_hash) VALUES (%s,%s,%s)",
            (record["email"], record["mobile"], record["password_hash"]),
        )
        user_id = cursor.lastrowid
        cursor.execute("INSERT INTO profiles (user_id) VALUES (%s)", (user_id,))
        cursor.execute("DELETE FROM signup_otp WHERE email=%s", (req.email,))
        db.commit()
        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("VERIFY-OTP ERROR:", e)
        raise HTTPException(500, "Verification failed")
    finally:
        cursor.close()
        db.close()


@app.post("/login")
def login(req: LoginRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT user_id, password_hash FROM users WHERE email=%s", (req.email,)
        )
        user = cursor.fetchone()
        if not user or not verify_password(req.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = create_token(user["user_id"])
        expires_at = datetime.utcnow() + timedelta(hours=24)
        cursor.execute(
            "INSERT INTO auth_tokens (user_id, jwt_token, expires_at) VALUES (%s,%s,%s)",
            (user["user_id"], token, expires_at),
        )
        db.commit()
        return {"access_token": token}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("LOGIN ERROR:", e)
        raise HTTPException(500, "Login failed")
    finally:
        cursor.close()
        db.close()


@app.post("/forgot-password/send-otp")
def forgot_send_otp(req: ForgotPasswordRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT user_id FROM users WHERE email=%s", (req.email,))
        if not cursor.fetchone():
            raise HTTPException(404, "User not found")

        otp = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=5)
        cursor.execute("DELETE FROM forgot_password_otp WHERE email=%s", (req.email,))
        cursor.execute(
            "INSERT INTO forgot_password_otp (email, otp, expires_at) VALUES (%s,%s,%s)",
            (req.email, otp, expires_at),
        )
        db.commit()
        send_otp_email(req.email, otp)
        return {"success": True, "message": "OTP sent"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("FORGOT-OTP ERROR:", e)
        raise HTTPException(500, "Failed to send OTP")
    finally:
        cursor.close()
        db.close()


@app.post("/forgot-password/reset")
def reset_password(req: ResetPasswordRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM forgot_password_otp WHERE email=%s AND otp=%s",
            (req.email, req.otp),
        )
        record = cursor.fetchone()
        if not record:
            raise HTTPException(400, "Invalid OTP")
        if datetime.utcnow() > record["expires_at"]:
            raise HTTPException(400, "OTP expired")

        hashed = hash_password(req.new_password)
        cursor.execute(
            "UPDATE users SET password_hash=%s WHERE email=%s", (hashed, req.email)
        )
        cursor.execute("DELETE FROM forgot_password_otp WHERE email=%s", (req.email,))
        db.commit()
        return {"success": True, "message": "Password reset successful"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("RESET-PASSWORD ERROR:", e)
        raise HTTPException(500, "Reset failed")
    finally:
        cursor.close()
        db.close()


@app.post("/admin/login")
def admin_login(req: LoginRequest):
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

    if req.email != ADMIN_EMAIL or req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT user_id FROM users WHERE email=%s", (ADMIN_EMAIL,))
        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(500, "Admin user missing in DB")

        token = create_token(admin["user_id"])
        expires_at = datetime.utcnow() + timedelta(hours=24)
        cursor.execute(
            "INSERT INTO auth_tokens (user_id, jwt_token, expires_at) VALUES (%s,%s,%s)",
            (admin["user_id"], token, expires_at),
        )
        db.commit()
        return {"access_token": token}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("ADMIN-LOGIN ERROR:", e)
        raise HTTPException(500, "Admin login failed")
    finally:
        cursor.close()
        db.close()


# =============================================================================
#  USER / PROFILE
# =============================================================================

@app.get("/me")
def get_me(user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT u.email, b.business_name
            FROM users u
            LEFT JOIN profiles p ON p.user_id = u.user_id
            LEFT JOIN businesses b ON b.profile_id = p.profile_id
            WHERE u.user_id = %s
            """,
            (user_id,),
        )
        row = cursor.fetchone()
        return {
            "email": row["email"],
            "business_name": row["business_name"] or "My Business",
        }
    finally:
        cursor.close()
        db.close()


@app.get("/me/business")
def get_my_business(user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        # require_business raises 400 if not found; we catch that to return exists:False
        try:
            business_id = require_business(user_id, db)
        except HTTPException:
            return {"exists": False}

        cursor.execute(
            "SELECT * FROM businesses WHERE business_id = %s", (business_id,)
        )
        business = cursor.fetchone()
        if not business:
            return {"exists": False}

        return {"exists": True, "data": _clean_business(business)}
    finally:
        cursor.close()
        db.close()


# =============================================================================
#  NETWORK
# =============================================================================

@app.post("/network/add-user")
def add_secondary_user(
    req: AddSecondaryUserRequest,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT email FROM users WHERE user_id=%s", (user_id,))
        primary = cursor.fetchone()
        if not primary:
            raise HTTPException(404, "Primary user not found")

        cursor.execute(
            "SELECT user_id, email FROM users WHERE email=%s", (req.email,)
        )
        secondary = cursor.fetchone()
        if not secondary:
            raise HTTPException(404, "User not found")
        if secondary["user_id"] == user_id:
            raise HTTPException(400, "Cannot add yourself")

        cursor.execute(
            """
            INSERT IGNORE INTO network
            (primary_user_id, primary_email, secondary_user_id, secondary_email, role)
            VALUES (%s,%s,%s,%s,'secondary')
            """,
            (user_id, primary["email"], secondary["user_id"], secondary["email"]),
        )
        db.commit()
        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("ADD-USER ERROR:", e)
        raise HTTPException(500, "Failed to add user")
    finally:
        cursor.close()
        db.close()







@app.get("/network/secondary-users")
def get_secondary_users(
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        # Check if this user is a secondary user
        cursor.execute(
            "SELECT 1 FROM network WHERE secondary_user_id=%s LIMIT 1",
            (user_id,),
        )
        is_secondary = cursor.fetchone()

        # If secondary → return empty

        # If primary → return only their added members
        cursor.execute(
            """
            SELECT primary_user_id
            FROM network
            WHERE secondary_user_id=%s
            LIMIT 1
            """,
            (user_id,)
        )

        mapping = cursor.fetchone()

        owner_id = (
            mapping["primary_user_id"]
            if mapping
            else user_id
        )

        # Get owner email
        cursor.execute(
            """
            SELECT email
            FROM users
            WHERE user_id=%s
            """,
            (owner_id,)
        )

        owner = cursor.fetchone()

        users = [
            {
                "user_id": owner_id,
                "email": owner["email"]
            }
        ]

        cursor.execute(
            """
            SELECT secondary_user_id AS user_id,
                secondary_email AS email
            FROM network
            WHERE primary_user_id=%s
            """,
            (owner_id,)
        )

        users.extend(cursor.fetchall())

        return {
            "success": True,
            "data": users
        }

    finally:
        cursor.close()
        db.close()


# =============================================================================
#  BUSINESS SETUP
# =============================================================================

@app.post("/setup-business")
def setup_business(
    req: BusinessSetupRequest,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT profile_id FROM profiles WHERE user_id=%s", (user_id,)
        )
        profile = cursor.fetchone()
        if not profile:
            raise HTTPException(404, "Profile not found")

        profile_id = profile["profile_id"]

        cursor.execute(
            """
            INSERT INTO businesses (
                profile_id, business_name, description, description_file_url,
                business_type, industry, year_established,
                owner_name, email, phone, logo_url, logo_placement,
                website_url, brand_color,tagline, hashtags,
                street_address, city, state, country, postal_code,
                registration_number, tax_id,
                default_currency, timezone, fiscal_year_start,
                language_preference, notification_preference,
                terms_accepted, privacy_accepted, is_completed
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,
                %s,%s,%s,%s,
                %s,%s,%s,%s,%s,
                %s,%s,
                %s,%s,%s,
                %s,%s,
                %s,%s,TRUE
            )
            ON DUPLICATE KEY UPDATE
                business_name=VALUES(business_name),
                description=VALUES(description),
                description_file_url=VALUES(description_file_url),
                business_type=VALUES(business_type),
                industry=VALUES(industry),
                year_established=VALUES(year_established),
                owner_name=VALUES(owner_name),
                email=VALUES(email),
                phone=VALUES(phone),
                logo_url=VALUES(logo_url),
                logo_placement=VALUES(logo_placement),
                website_url=VALUES(website_url),
                brand_color=VALUES(brand_color),
                tagline = VALUES(tagline),
                hashtags = VALUES(hashtags),
                street_address=VALUES(street_address),
                city=VALUES(city),
                state=VALUES(state),
                country=VALUES(country),
                postal_code=VALUES(postal_code),
                registration_number=VALUES(registration_number),
                tax_id=VALUES(tax_id),
                default_currency=VALUES(default_currency),
                timezone=VALUES(timezone),
                fiscal_year_start=VALUES(fiscal_year_start),
                language_preference=VALUES(language_preference),
                notification_preference=VALUES(notification_preference),
                terms_accepted=VALUES(terms_accepted),
                privacy_accepted=VALUES(privacy_accepted),
                is_completed=TRUE
            """,
            (
                profile_id, req.business_name, req.description, req.description_file_url,
                req.business_type, req.industry, req.year_established,
                req.owner_name, req.email, req.phone, req.logo_url, req.logo_placement,
                req.website_url, req.brand_color, req.tagline, req.hashtags,
                req.street_address, req.city, req.state, req.country, req.postal_code,
                req.registration_number, req.tax_id,
                req.default_currency, req.timezone, req.fiscal_year_start,
                req.language_preference, req.notification_preference,
                req.terms_accepted, req.privacy_accepted,
            ),
        )
        db.commit()

        # ==============================
        # AUTO ADD DEFAULT TEAM MEMBER
        # ==============================
        default_email = os.getenv("DEFAULT_TEAM_EMAIL")

        if default_email:
            cursor.execute(
                "SELECT user_id, email FROM users WHERE email=%s",
                (default_email,),
            )
            default_user = cursor.fetchone()

            if default_user:
                # Get current user's email
                cursor.execute(
                    "SELECT email FROM users WHERE user_id=%s",
                    (user_id,),
                )
                primary = cursor.fetchone()

                cursor.execute(
                    """
                    INSERT IGNORE INTO network
                    (primary_user_id, primary_email, secondary_user_id, secondary_email, role)
                    VALUES (%s,%s,%s,%s,'default')
                    """,
                    (
                        user_id,
                        primary["email"],
                        default_user["user_id"],
                        default_user["email"],
                    ),
                )
                db.commit()

        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("SETUP-BUSINESS ERROR:", e)
        raise HTTPException(500, "Failed to save business")
    finally:
        cursor.close()
        db.close()


# =============================================================================
#  CATEGORIES
# =============================================================================

@app.get("/categories")
def fetch_categories():
    return get_categories()


@app.get("/subcategories/{category}")
def fetch_subcategories(category: str):
    return get_subcategories(category)


# =============================================================================
#  PERSONAS
# =============================================================================

@app.post("/personas")
def create_persona(
    req: CreatePersonaRequest,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        business_id = require_business(user_id, db)

        if req.persona_id:
            persona_id = req.persona_id
            cursor.execute(
                """
                UPDATE personas 
                SET persona_name=%s, hashtags=%s
                WHERE persona_id=%s AND business_id=%s
                """,
                (req.persona_name, json.dumps(req.hashtags), persona_id, business_id),
            )
        else:
            cursor.execute(
                "INSERT INTO personas (business_id, persona_name, hashtags) VALUES (%s,%s,%s)",
                (business_id, req.persona_name, json.dumps(req.hashtags)),
            )
            persona_id = cursor.lastrowid

        # Refresh all segments in one batch
        cursor.execute(
            "DELETE FROM persona_segments WHERE persona_id=%s", (persona_id,)
        )
        if req.segments:
            cursor.executemany(
                """
                INSERT INTO persona_segments
                (persona_id, segment_type, label, value, is_active)
                VALUES (%s,%s,%s,%s,%s)
                """,
                [
                    (persona_id, s.segment_type, s.label, s.value, s.is_active)
                    for s in req.segments
                ],
            )
        db.commit()
        return {"success": True, "persona_id": persona_id}

    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Persona with this name already exists.")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("PERSONA SAVE ERROR:", e)
        raise HTTPException(500, "Failed to save persona")
    finally:
        cursor.close()
        db.close()


@app.get("/personas")
def get_personas(user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        business_id = require_business(user_id, db)

        cursor.execute(
            "SELECT * FROM personas WHERE business_id=%s", (business_id,)
        )
        personas = cursor.fetchall()

        for persona in personas:
            persona["hashtags"] = json.loads(persona["hashtags"]) if persona.get("hashtags") else []
            cursor.execute(
                "SELECT segment_type, label, value, is_active FROM persona_segments WHERE persona_id=%s",
                (persona["persona_id"],),
            )
            persona["segments"] = cursor.fetchall()

        return {"success": True, "data": personas}
    finally:
        cursor.close()
        db.close()


# =============================================================================
#  PRODUCTS
# =============================================================================

@app.post("/products")
def create_product(
    req: CreateProductRequest,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        business_id = require_business(user_id, db)

        if req.product_id:
            product_id = req.product_id
            cursor.execute(
                """
                UPDATE products 
                SET product_name=%s, product_description=%s, hashtags=%s
                WHERE product_id=%s AND business_id=%s
                """,
                (
                    req.product_name,
                    req.product_description,
                    json.dumps(req.hashtags),
                    product_id,
                    business_id,
                ),
            )
            # Clear existing child records before re-inserting
            for table in ("product_features", "product_usps", "product_values", "product_images"):
                cursor.execute(f"DELETE FROM {table} WHERE product_id=%s", (product_id,))
        else:
            cursor.execute(
                "INSERT INTO products (business_id, product_name, product_description, hashtags) VALUES (%s,%s,%s,%s)",
                (business_id, req.product_name, req.product_description, json.dumps(req.hashtags)),
            )
            product_id = cursor.lastrowid

        # Batch insert child records
        features = [(product_id, f) for f in req.features if f.strip()]
        if features:
            cursor.executemany(
                "INSERT INTO product_features (product_id, feature_text) VALUES (%s,%s)",
                features,
            )

        usps = [(product_id, u) for u in req.usps if u.strip()]
        if usps:
            cursor.executemany(
                "INSERT INTO product_usps (product_id, usp_text) VALUES (%s,%s)", usps
            )

        values = [(product_id, v) for v in req.values if v.strip()]
        if values:
            cursor.executemany(
                "INSERT INTO product_values (product_id, value_text) VALUES (%s,%s)", values
            )

        images = [(product_id, img["img_url"], img.get("img_caption", "")) for img in req.images]
        if images:
            cursor.executemany(
                "INSERT INTO product_images (product_id, img_url, img_caption) VALUES (%s,%s,%s)",
                images,
            )

        db.commit()
        return {"success": True, "product_id": product_id}

    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Product with this name already exists.")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("PRODUCT SAVE ERROR:", e)
        raise HTTPException(500, "Failed to save product")
    finally:
        cursor.close()
        db.close()


@app.get("/products")
def get_products(user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        business_id = require_business(user_id, db)
        cursor.execute(
            "SELECT product_id, product_name FROM products WHERE business_id=%s ORDER BY created_at DESC",
            (business_id,),
        )
        return {"success": True, "data": cursor.fetchall()}
    finally:
        cursor.close()
        db.close()


def _fetch_product_detail(cursor, product_id: int) -> dict:
    """Shared product detail fetch used by multiple endpoints."""
    cursor.execute("SELECT * FROM products WHERE product_id=%s", (product_id,))
    product = cursor.fetchone()

    if not product:
        return None
    
    hashtags = json.loads(product["hashtags"]) if product.get("hashtags") else []

    cursor.execute(
        "SELECT feature_text FROM product_features WHERE product_id=%s", (product_id,)
    )
    features = [r["feature_text"] for r in cursor.fetchall()]

    cursor.execute(
        "SELECT usp_text FROM product_usps WHERE product_id=%s", (product_id,)
    )
    usps = [r["usp_text"] for r in cursor.fetchall()]

    cursor.execute(
        "SELECT value_text FROM product_values WHERE product_id=%s", (product_id,)
    )
    values = [r["value_text"] for r in cursor.fetchall()]

    cursor.execute(
        "SELECT img_url FROM product_images WHERE product_id=%s", (product_id,)
    )
    images = cursor.fetchall()

    return {
        "product_name": product["product_name"],
        "product_description": product["product_description"],
        "features": features,
        "usps": usps,
        "values": values,
        "images": images,
        "hashtags": hashtags
    }


@app.get("/products/{product_id}")
def get_product(product_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        data = _fetch_product_detail(cursor, product_id)
        if not data:
            raise HTTPException(404, "Product not found")
        return {"success": True, "data": data}
    finally:
        cursor.close()
        db.close()















@app.post(
    "/products/{product_id}/upload-image"
)
def upload_product_image(

    product_id:int,

    file:UploadFile=File(...),

    user_id:int=Depends(get_current_user)

):

    db=get_db()

    cursor=db.cursor()

    try:

        extension=file.filename.split(".")[-1]

        filename=f"{uuid.uuid4()}.{extension}"

        key=f"products/{filename}"

        s3.upload_fileobj(

            file.file,

            BUCKET_NAME,

            key,

            ExtraArgs={

                "ContentType":file.content_type

            }

        )

        image_url=f"{S3_BASE_URL}/{key}"

        cursor.execute(

            """

            INSERT INTO product_images

            (

                product_id,

                img_url,

                img_caption

            )

            VALUES

            (

                %s,

                %s,

                ''

            )

            """,

            (

                product_id,

                image_url

            )

        )

        db.commit()

        return{

            "success":True,

            "url":image_url

        }

    except Exception as e:

        db.rollback()

        return{

            "success":False,

            "message":str(e)

        }

    finally:

        cursor.close()

        db.close()


# =============================================================================
#  MEDIA TYPES / SUBTYPES / FIELDS
# =============================================================================

@app.get("/media-types")
def get_media_types(mode: str, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT media_id FROM media WHERE media_name=%s", (mode,))
        media = cursor.fetchone()
        if not media:
            return {"success": False, "data": []}
        cursor.execute(
            "SELECT media_type FROM media_type WHERE media_id=%s ORDER BY media_type ASC",
            (media["media_id"],),
        )
        return {"success": True, "data": cursor.fetchall()}
    finally:
        cursor.close()
        db.close()


@app.get("/media-subtypes")
def get_media_subtypes(
    mode: str, mediaType: str, user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT media_id FROM media WHERE media_name=%s", (mode,))
        media = cursor.fetchone()
        if not media:
            return {"success": False}
        cursor.execute(
            "SELECT media_type_id FROM media_type WHERE media_id=%s AND media_type=%s",
            (media["media_id"], mediaType),
        )
        mt = cursor.fetchone()
        if not mt:
            return {"success": False}
        cursor.execute(
            "SELECT media_subtype_id, subtype_name FROM media_subtype WHERE media_type_id=%s ORDER BY media_subtype_id ASC",
            (mt["media_type_id"],),
        )
        return {"success": True, "data": cursor.fetchall()}
    finally:
        cursor.close()
        db.close()


@app.get("/media-fields")
def get_media_fields(
    mode: str,
    mediaType: str,
    subType: str,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        _, _, media_subtype_id = resolve_media_subtype(cursor, mode, mediaType, subType)

        cursor.execute(
            """
            SELECT default_value_id AS id, label, label_description, variable_name, box
            FROM media_subtype_default_value
            WHERE media_subtype_id=%s
            ORDER BY default_value_id ASC
            """,
            (media_subtype_id,),
        )
        rows = cursor.fetchall()
        return {
            "success": True,
            "data": {
                "mandatory": [r for r in rows if r["box"] == "mandatory"],
                "optional": [r for r in rows if r["box"] == "optional"],
            },
        }
    except HTTPException:
        return {"success": False}
    finally:
        cursor.close()
        db.close()


# =============================================================================
#  GENERATE PROMPT
# =============================================================================

@app.post("/generate")
async def generate_prompt(
    req: GenerateRequest,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor()
    try:
        base_prompt = build_prompt(req, req.category)

        cursor.execute(
            """
            SELECT label, value, box
            FROM media_subtype_field_value
            WHERE docket_id=%s AND checkbox_clicked=1 AND field_source='custom'
            """,
            (req.docket_id,),
        )
        rows = cursor.fetchall()

        mandatory_block = "\n".join(
            f"{label}: {value}" for label, value, box in rows
            if box == "mandatory" and value and value.strip()
        )
        optional_block = "\n".join(
            f"{label}: {value}" for label, value, box in rows
            if box == "optional" and value and value.strip()
        )

        prompt = "\n\n".join(filter(None, [base_prompt, mandatory_block, optional_block])).strip()

        cursor.execute(
            "INSERT INTO docket_results (docket_id, prompt_text, created_by) VALUES (%s,%s,%s)",
            (req.docket_id, prompt, user_id),
        )
        db.commit()
        return {"success": True, "output": prompt}

    except Exception as e:
        db.rollback()
        print("GENERATE ERROR:", e)
        return {"success": False}
    finally:
        cursor.close()
        db.close()


# =============================================================================
#  AI CHAT
# =============================================================================

@app.post("/chat")
async def chat_with_ai(
    req: ChatRequest,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:

        # ==========================================
        # GET BUSINESS ID
        # ==========================================

        business_id = require_business(user_id, db)

        # ==========================================
        # FETCH PREVIOUS VALUES
        # ==========================================

        cursor.execute("""
            SELECT label, value
            FROM media_subtype_field_value
            WHERE docket_id=%s AND checkbox_clicked=1
        """, (req.docket_id,))

        rows = cursor.fetchall()

        previous_values = {
            row["label"]: row["value"]
            for row in rows
            if row["value"]
        }


        # ==========================================
        # GET FIELD DESCRIPTIONS
        # ==========================================

        _, _, media_subtype_id = resolve_media_subtype(
            cursor,
            req.mode,
            req.mediaType,
            req.subType
        )

        cursor.execute(
            """
            SELECT description
            FROM media_subtype
            WHERE media_subtype_id=%s
            """,
            (media_subtype_id,)
        )

        subtype_row = cursor.fetchone()

        media_subtype_description = ""

        if subtype_row:
            media_subtype_description = (
                subtype_row["description"] or ""
            )

        cursor.execute(
            """
            SELECT
                label,
                label_description
            FROM media_subtype_default_value
            WHERE media_subtype_id=%s
            """,
            (media_subtype_id,)
        )

        field_rows = cursor.fetchall()

        fields_for_ai = []

        for row in field_rows:

            fields_for_ai.append({
                "label": row["label"],
                "description": row["label_description"] or ""
            })


        
        # =====================================================
        # Load custom labels added by the user
        # =====================================================

        cursor.execute(
            """
            SELECT label
            FROM media_subtype_field_value
            WHERE docket_id=%s
            AND field_source='custom'
            """,
            (req.docket_id,)
        )

        custom_rows = cursor.fetchall()

        existing_labels = {
            f["label"].strip().lower()
            for f in fields_for_ai
        }

        for row in custom_rows:
            label = row["label"].strip()

            if label.lower() not in existing_labels:
                fields_for_ai.append({
                    "label": label,
                    "description": "User-created custom field."
                })








        # ==========================================
        # ASK OPENAI
        # ==========================================

        ai_result = ask_openai(
            message=req.message,
            context={
                "mode": req.mode,
                "mediaType": req.mediaType,
                "subType": req.subType,
                "subTypeDescription": media_subtype_description,
                "business": req.business,
                "product": req.product,
                "persona": req.persona,

                "execute_title": req.execute_title,
                "execute_description": req.execute_description,
                "visual_elements": req.visual_elements,

                "summary": req.summary,

                "fields": fields_for_ai,
                "previous_values": previous_values
            },
        )

        response_data = ai_result["response"]


        print(json.dumps(response_data, indent=2))

        field_values = response_data.get("fields", {})
        print("========== AI FIELDS ==========")
        print(json.dumps(field_values, indent=2))
        print("================================")


        print("AI FIELD VALUES:", field_values)

        new_execute_description = response_data.get(
            "execute_description",
            req.execute_description
        )

        new_visual_elements = response_data.get(
            "visual_elements",
            req.visual_elements
        )


        normal_execute_description = new_execute_description
        normal_visual_elements = new_visual_elements



        # ==========================================
        # SECOND AI PASS
        # ==========================================

        enhanced_result = enrich_description_and_visuals(
            field_values=field_values,
            execute_description=new_execute_description,
            visual_elements=new_visual_elements
        )

        new_summary = enhanced_result.get(
            "summary",
            req.summary
        )









        # ==========================================
        # SAVE AI GENERATED FIELD VALUES
        # ==========================================

        cursor.execute(
            """
            SELECT label, box, field_source, checkbox_clicked
            FROM media_subtype_field_value
            WHERE docket_id=%s
            """,
            (req.docket_id,)
        )

        existing_rows = cursor.fetchall()

        for row in existing_rows:

            db_label = row["label"]

            if db_label in field_values:

                cursor.execute(
                    """
                    UPDATE media_subtype_field_value
                    SET value=%s
                    WHERE docket_id=%s
                    AND label=%s
                    """,
                    (
                        str(field_values[db_label]),
                        req.docket_id,
                        db_label
                    )
                )



        cursor.execute("""
            UPDATE docket
            SET
                summary=%s
            WHERE docket_id=%s
        """, (
            new_summary,
            req.docket_id
        ))






        full_information = ai_result["full_information"]

        cursor.execute(
            "INSERT INTO chatbot_history (docket_id, input_json, output_json) VALUES (%s,%s,%s)",
            (
                req.docket_id,
                json.dumps({
                    "message": req.message,
                    "mode": req.mode,
                    "mediaType": req.mediaType,
                    "subType": req.subType,
                }),
                json.dumps(field_values),
            ),
        )


        # ==========================================
        # SAVE FULL CHATBOT INFORMATION
        # ==========================================

        cursor.execute(
            """
            INSERT INTO chatbot_information
            (
                business_id,
                docket_id,
                query,
                information
            )
            VALUES (%s,%s,%s,%s)
            """,
            (
                business_id,
                req.docket_id,
                req.message,
                full_information
            )
        )

        print("NEW CHAT API RUNNINGGGGGGGGGGGG")






        db.commit()
        return {
            "success": True,
            "fields": field_values,
            "summary": new_summary
        }

    except Exception as e:
        db.rollback()
        print("CHAT ERROR:", e)
        return {"success": False}
    finally:
        cursor.close()
        db.close()


@app.get("/planner/docket/{docket_id}/chat-history")
def get_chat_history(docket_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT input_json, output_json, created_datetime FROM chatbot_history WHERE docket_id=%s ORDER BY created_datetime ASC",
            (docket_id,),
        )
        history = [
            {"user": json.loads(r["input_json"]).get("message"), "ai": json.loads(r["output_json"])}
            for r in cursor.fetchall()
        ]
        return {"success": True, "data": history}
    finally:
        cursor.close()
        db.close()


# =============================================================================
#  DOCKETS  —  create / get / planner list
# =============================================================================



def generate_default_ai_fields(
    cursor,
    docket_id,
    business_id,
    product_id,
    persona_id,
    mode,
    media_type,
    sub_type,
    title,
    execute_description,
    visual_elements
):
    # BUSINESS

    cursor.execute(
        "SELECT * FROM businesses WHERE business_id=%s",
        (business_id,)
    )

    business = cursor.fetchone()


    # PRODUCT

    product = _fetch_product_detail(
        cursor,
        product_id
    )


    # PERSONA

    cursor.execute(
        "SELECT * FROM personas WHERE persona_id=%s",
        (persona_id,)
    )

    persona = cursor.fetchone()

    cursor.execute(
        """
        SELECT
            segment_type,
            label,
            value,
            is_active
        FROM persona_segments
        WHERE persona_id=%s
        """,
        (persona_id,)
    )

    persona["segments"] = cursor.fetchall()


    # MEDIA SUBTYPE

    _, _, media_subtype_id = resolve_media_subtype(
        cursor,
        mode,
        media_type,
        sub_type
    )


    cursor.execute(
        """
        SELECT description
        FROM media_subtype
        WHERE media_subtype_id=%s
        """,
        (media_subtype_id,)
    )

    subtype_data = cursor.fetchone()

    media_subtype_description = ""

    if subtype_data:
        media_subtype_description = (
            subtype_data["description"] or ""
        )


    # GET FIELDS

    cursor.execute(
        """
        SELECT
            label,
            label_description,
            box
        FROM media_subtype_default_value
        WHERE media_subtype_id=%s
        """,
        (media_subtype_id,)
    )

    field_rows = cursor.fetchall()

    fields_for_ai = []

    for row in field_rows:

        fields_for_ai.append({
            "label": row["label"],
            "description": row["label_description"] or ""
        })


    # AI CALL

    ai_result = ask_openai(
        message="Generate all fields",
        context={
            "mode": mode,
            "mediaType": media_type,
            "subType": sub_type,
            "subTypeDescription": media_subtype_description,
            "business": business,
            "product": product,
            "persona": persona,
            "execute_title": title,
            "execute_description": execute_description,
            "visual_elements": visual_elements,
            "fields": fields_for_ai,
            "previous_values": {}
        }
    )

    generated = ai_result["response"].get(
        "fields",
        {}
    )


    # SAVE VALUES

    for field in field_rows:

        label = field["label"]

        value = generated.get(
            label,
            ""
        )

        cursor.execute(
            """
            INSERT INTO media_subtype_field_value
            (
                docket_id,
                label,
                value,
                checkbox_clicked,
                box,
                field_source
            )
            VALUES (%s,%s,%s,%s,%s,%s)
            """,
            (
                docket_id,
                label,
                value,
                1,
                field["box"],
                "default"
            )
        )







@app.post("/planner/docket")
def create_docket(
    req: CreateDocketRequest,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        business_id = require_business(user_id, db)

        if not req.product_id:
            raise HTTPException(400, "PRODUCT_REQUIRED")
        if not req.persona_id:
            raise HTTPException(400, "PERSONA_REQUIRED")

        media_id, media_type_id, media_subtype_id = resolve_media_subtype(
            cursor, req.mode, req.mediaType, req.subType
        )

        cursor.execute(
            """
            INSERT INTO docket
            (
                title,
                tab,
                business_id,
                product_id,
                persona_id,
                occasion_id,
                media_id,
                media_type_id,
                media_subtype_id,
                planner_date_time,
                uploaded_date_time,
                execute_description,
                visual_elements,
                summary
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                req.title,
                req.tab,
                business_id,
                req.product_id,
                req.persona_id,
                req.occasion_id,
                media_id,
                media_type_id,
                media_subtype_id,
                req.planner_date_time,
                req.uploaded_date_time or datetime.utcnow(),
                req.execute_description,
                req.visual_elements,
                req.summary,
            ),
        )


        docket_id = cursor.lastrowid

        generate_default_ai_fields(
            cursor=cursor,
            docket_id=docket_id,
            business_id=business_id,
            product_id=req.product_id,
            persona_id=req.persona_id,
            mode=req.mode,
            media_type=req.mediaType,
            sub_type=req.subType,
            title=req.title,
            execute_description=req.execute_description,
            visual_elements=req.visual_elements
        )

        db.commit()

        return {"success": True, "docket_id": docket_id}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("DOCKET SAVE ERROR:", e)
        return {"success": False}
    finally:
        cursor.close()
        db.close()


@app.get("/planner/docket/{docket_id}")
def get_docket(docket_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT d.*, m.media_name, mt.media_type, ms.subtype_name,
                   p.product_name, pe.persona_name, o.title AS occasion_title
            FROM docket d
            LEFT JOIN media m ON d.media_id = m.media_id
            LEFT JOIN media_type mt ON d.media_type_id = mt.media_type_id
            LEFT JOIN media_subtype ms ON d.media_subtype_id = ms.media_subtype_id
            LEFT JOIN products p ON d.product_id = p.product_id
            LEFT JOIN personas pe ON d.persona_id = pe.persona_id
            LEFT JOIN occasions o ON d.occasion_id = o.occasion_id
            WHERE d.docket_id = %s
            """,
            (docket_id,),
        )
        docket = cursor.fetchone()
        if not docket:
            return {"success": False}
        return {"success": True, "data": docket}
    finally:
        cursor.close()
        db.close()


@app.get("/planner/dockets")
def get_my_dockets(
    selected_date: date,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        # Check if secondary user
        cursor.execute(
            "SELECT primary_user_id FROM network WHERE secondary_user_id=%s LIMIT 1",
            (user_id,),
        )
        mapping = cursor.fetchone()
        business_id = require_business(user_id, db)

        if mapping:
            cursor.execute(
                """
                SELECT DISTINCT
                    d.docket_id,
                    d.title,
                    d.tab,
                    d.planner_date_time,
                    m.media_name, mt.media_type, ms.subtype_name,
                    p.product_name, pe.persona_name
                FROM docket d
                LEFT JOIN (
                    SELECT ea1.*
                    FROM execute_assignments ea1
                    WHERE ea1.assignment_id = (
                        SELECT ea2.assignment_id FROM execute_assignments ea2
                        WHERE ea2.execute_id = ea1.execute_id
                        ORDER BY ea2.created_at DESC LIMIT 1
                    )
                ) ea ON ea.execute_id = d.docket_id
                LEFT JOIN media m ON d.media_id = m.media_id
                LEFT JOIN media_type mt ON d.media_type_id = mt.media_type_id
                LEFT JOIN media_subtype ms ON d.media_subtype_id = ms.media_subtype_id
                LEFT JOIN products p ON d.product_id = p.product_id
                LEFT JOIN personas pe ON d.persona_id = pe.persona_id
                WHERE (d.business_id=%s OR ea.assigned_to=%s)
                AND DATE(d.uploaded_date_time)=%s
                ORDER BY d.planner_date_time DESC
                """,
                (business_id, user_id, selected_date),
            )
        else:
            cursor.execute(
                """
                SELECT 
                    d.docket_id, 
                    d.title, 
                    d.tab, 
                    d.planner_date_time,
                    d.uploaded_date_time,

                    dma.uploaded_url,
                    ea.stage AS current_stage,

                    m.media_name, 
                    mt.media_type, 
                    ms.subtype_name,
                    p.product_name, 
                    pe.persona_name
                FROM docket d
                LEFT JOIN media m ON d.media_id = m.media_id
                LEFT JOIN media_type mt ON d.media_type_id = mt.media_type_id
                LEFT JOIN media_subtype ms ON d.media_subtype_id = ms.media_subtype_id
                LEFT JOIN products p ON d.product_id = p.product_id
                LEFT JOIN personas pe ON d.persona_id = pe.persona_id
                LEFT JOIN (
                    SELECT x.*
                    FROM docket_media_admin x
                    INNER JOIN (
                        SELECT docket_id, MAX(admin_media_id) AS latest_id
                        FROM docket_media_admin
                        GROUP BY docket_id
                    ) y
                    ON x.admin_media_id = y.latest_id
                ) dma
                ON dma.docket_id = d.docket_id


                LEFT JOIN (
                    SELECT ea1.*
                    FROM execute_assignments ea1
                    WHERE ea1.assignment_id = (
                        SELECT ea2.assignment_id
                        FROM execute_assignments ea2
                        WHERE ea2.execute_id = ea1.execute_id
                        ORDER BY ea2.created_at DESC
                        LIMIT 1
                    )
                ) ea
                ON ea.execute_id = d.docket_id



                WHERE d.business_id=%s AND DATE(d.uploaded_date_time)=%s
                ORDER BY d.planner_date_time DESC
                """,
                (business_id, selected_date),
            )

        return {"success": True, "data": cursor.fetchall()}
    finally:
        cursor.close()
        db.close()








def apply_execute_filters(
    query,
    params,

    mapping,
    user_id,

    product_id,
    persona_id,
    occasion_id,

    media_type,
    subtype_name,

    search,

    start_date,
    end_date,

    stage
):

    if mapping:

        query += """
            AND ea.assigned_to = %s
        """

        params.append(user_id)

    if product_id:

        query += """
            AND d.product_id=%s
        """

        params.append(product_id)

    if persona_id:

        query += """
            AND d.persona_id=%s
        """

        params.append(persona_id)

    if occasion_id:

        query += """
            AND d.occasion_id=%s
        """

        params.append(occasion_id)

    if media_type:

        query += """
            AND mt.media_type=%s
        """

        params.append(media_type)

    if subtype_name:

        query += """
            AND ms.subtype_name=%s
        """

        params.append(subtype_name)

    if search:

        query += """
            AND
            (
                d.title LIKE %s
                OR
                p.product_name LIKE %s
                OR
                pe.persona_name LIKE %s
            )
        """

        search_like = f"%{search}%"

        params.extend([
            search_like,
            search_like,
            search_like
        ])

    if start_date and end_date:

        query += """
            AND d.uploaded_date_time
            BETWEEN %s AND %s
        """

        params.extend([
            start_date,
            end_date
        ])

    elif start_date:

        query += """
            AND d.uploaded_date_time >= %s
        """

        params.append(start_date)

    elif end_date:

        query += """
            AND d.uploaded_date_time <= %s
        """

        params.append(end_date)

    if stage:

        if stage.lower() == "discovery":

            query += """
                AND
                (
                    ea.stage IS NULL
                    OR ea.stage='discovery'
                )
            """

        else:

            query += """
                AND ea.stage=%s
            """

            params.append(stage)

    return query, params








# =============================================================================
#  All Filter Endpoints
# =============================================================================

def get_all_users(user_id: int, cursor):
    """
    Returns all users in the current network.
    Includes the owner and all secondary users.
    """

    cursor.execute(
        """
        SELECT primary_user_id
        FROM network
        WHERE secondary_user_id = %s
        GROUP BY primary_user_id
        """,
        (user_id,)
    )


    network_users = [user_id]

    for r in cursor.fetchall():
        network_users.append(r["primary_user_id"])

    return network_users





@app.get("/appframe/filter-occasion")
def get_filter_occasion(
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        network_users = get_all_users(user_id, cursor)

        placeholders = ",".join(["%s"] * len(network_users))

        cursor.execute(
            f"""
            SELECT
                o.occasion_id AS id,
                o.title AS title,
                u.email AS user,
                CONCAT(
                    o.title,
                    ' -- ',
                    u.email
                ) AS display_name
            FROM occasions o
            INNER JOIN users u
                ON u.user_id = o.created_by
            WHERE o.created_by IN ({placeholders})
            ORDER BY o.created_by, o.title
            """,
            tuple(network_users)
        )

        occasions = cursor.fetchall()

        return {
            "success": True,
            "data": {
                "occasions": occasions
            }
        }

    finally:
        cursor.close()
        db.close()





@app.get("/appframe/filter-product")
def get_filter_product(
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        network_users = get_all_users(user_id, cursor)

        placeholders = ",".join(["%s"] * len(network_users))

        cursor.execute(
            f"""
            SELECT
                p.product_id AS id,
                p.product_name AS title,
                u.email AS user,
                CONCAT(
                    p.product_name,
                    ' -- ',
                    u.email
                ) AS display_name
            FROM products p
            INNER JOIN businesses b
                ON b.business_id = p.business_id
            INNER JOIN profiles pr
                ON pr.profile_id = b.profile_id
            INNER JOIN users u
                ON u.user_id = pr.user_id
            WHERE u.user_id IN ({placeholders})
            ORDER BY u.user_id, p.product_name
            """,
            tuple(network_users)
        )

        products = cursor.fetchall()

        return {
            "success": True,
            "data": {
                "products": products
            }
        }

    finally:
        cursor.close()
        db.close()





@app.get("/appframe/filter-persona")
def get_filter_persona(
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        network_users = get_all_users(user_id, cursor)

        placeholders = ",".join(["%s"] * len(network_users))

        cursor.execute(
            f"""
            SELECT
                p.persona_id AS id,
                p.persona_name AS title,
                u.email AS user,
                CONCAT(
                    p.persona_name,
                    ' -- ',
                    u.email
                ) AS display_name
            FROM personas p
            INNER JOIN businesses b
                ON b.business_id = p.business_id
            INNER JOIN profiles pr
                ON pr.profile_id = b.profile_id
            INNER JOIN users u
                ON u.user_id = pr.user_id
            WHERE u.user_id IN ({placeholders})
            ORDER BY u.user_id, p.persona_name
            """,
            tuple(network_users)
        )

        personas = cursor.fetchall()

        return {
            "success": True,
            "data": {
                "personas": personas
            }
        }

    finally:
        cursor.close()
        db.close()





@app.get("/appframe/filter-stage")
def get_filter_stage():
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                MIN(s_no) AS stage_id,
                current_stage AS stage_name
            FROM process_stage
            GROUP BY current_stage
            ORDER BY stage_id
            """
        )

        stages = cursor.fetchall()

        return {
            "success": True,
            "data": {
                "stages": stages
            }
        }

    finally:
        cursor.close()
        db.close()




#############################################################################

@app.get("/planner/carousel-dockets")
def get_carousel_dockets(

    occasion_id: list[int] = Query(default=[]),
    product_id: list[int] = Query(default=[]),
    persona_id: list[int] = Query(default=[]),
    stage: list[str] = Query(default=[]),

    start_date: datetime | None = None,
    end_date: datetime |None = None,

    search: str | None = None,

    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=10000),

    user_id: int = Depends(get_current_user)

):

    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        business_id = require_business_for_network_user(
            user_id,
            db
        )

        offset = (page - 1) * page_size

        query = """
            SELECT

                d.docket_id,
                d.title,
                d.uploaded_date_time,

                COALESCE(ea.stage, 'discovery') AS current_stage,

                dma.uploaded_url

            FROM docket d

            LEFT JOIN (

                SELECT
                    x.docket_id,
                    x.uploaded_url

                FROM docket_media_admin x

                INNER JOIN (

                    SELECT
                        docket_id,
                        MAX(admin_media_id) AS latest_id

                    FROM docket_media_admin

                    GROUP BY docket_id

                ) latest_img

                    ON latest_img.latest_id = x.admin_media_id

            ) dma

                ON dma.docket_id = d.docket_id

            LEFT JOIN (

                SELECT
                    ea.execute_id,
                    ea.assigned_to,
                    ea.stage

                FROM execute_assignments ea

                INNER JOIN (

                    SELECT
                        execute_id,
                        MAX(assignment_id) AS assignment_id

                    FROM execute_assignments

                    GROUP BY execute_id

                ) latest_assignment

                    ON latest_assignment.assignment_id = ea.assignment_id

            ) ea

                ON ea.execute_id = d.docket_id

            WHERE

            (
                d.business_id = %s
                OR ea.assigned_to = %s
            )

            AND d.tab = 'media'
        """

        params = [
            business_id,
            user_id
        ]

        base_query = query

        # ---------------- Occasion ----------------

        if occasion_id:

            placeholders = ",".join(["%s"] * len(occasion_id))

            query += f"""
                AND d.occasion_id IN ({placeholders})
            """

            params.extend(occasion_id)

        # ---------------- Product ----------------

        if product_id:

            placeholders = ",".join(["%s"] * len(product_id))

            query += f"""
                AND d.product_id IN ({placeholders})
            """

            params.extend(product_id)

        # ---------------- Persona ----------------

        if persona_id:

            placeholders = ",".join(["%s"] * len(persona_id))

            query += f"""
                AND d.persona_id IN ({placeholders})
            """

            params.extend(persona_id)

        # ---------------- Stage ----------------

        if stage:

            placeholders = ",".join(["%s"] * len(stage))

            query += f"""
                AND COALESCE(ea.stage, 'discovery') IN ({placeholders})
            """

            params.extend(stage)

        # ---------------- Start Date ----------------

        if start_date:

            query += """
                AND d.uploaded_date_time >= %s
            """

            params.append(start_date)

        # ---------------- End Date ----------------

        if end_date:

            query += """
                AND d.uploaded_date_time <= %s
            """

            params.append(end_date)

        # ---------------- Search ----------------

        if search and search.strip():

            query += """
                AND d.title LIKE %s
            """

            params.append(f"%{search.strip()}%")

        

        # ---------------- Total Count ----------------

        count_query = f"""
        SELECT COUNT(*) AS total
        FROM (
            {query}
        ) total_records
        """

        count_params = params.copy()

        cursor.execute(
            count_query,
            tuple(count_params)
        )

        total = cursor.fetchone()["total"]

        



        query += """
            ORDER BY
                d.uploaded_date_time ASC,
                d.docket_id ASC

            LIMIT %s OFFSET %s
        """

        params.extend([
            page_size,
            offset
        ])

        cursor.execute(
            query,
            tuple(params)
        )

        executes = cursor.fetchall()

        return {
            "success": True,
            "page": page,
            "page_size": page_size,
            "count": len(executes),
            "total": total,
            "data": executes
        }

    finally:

        cursor.close()
        db.close()








@app.get("/execute/default")
def get_default_execute(
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        business_id = require_business_for_network_user(
            user_id,
            db
        )

        cursor.execute(
            """
            SELECT primary_user_id
            FROM network
            WHERE secondary_user_id=%s
            LIMIT 1
            """,
            (user_id,)
        )

        mapping = cursor.fetchone()

        base_query = """
            SELECT
                d.docket_id,
                d.planner_date_time

            FROM docket d

            LEFT JOIN (
                SELECT ea1.*
                FROM execute_assignments ea1
                WHERE ea1.assignment_id = (
                    SELECT ea2.assignment_id
                    FROM execute_assignments ea2
                    WHERE ea2.execute_id = ea1.execute_id
                    ORDER BY ea2.created_at DESC
                    LIMIT 1
                )
            ) ea
            ON ea.execute_id = d.docket_id

            WHERE d.business_id=%s
        """

        params = [business_id]

        # Secondary users should only see executes assigned to them
        if mapping:
            base_query += """
                AND ea.assigned_to=%s
            """
            params.append(user_id)

        # =====================================================
        # 1. TODAY'S EXECUTE
        # =====================================================
        today_query = base_query + """
            AND DATE(d.planner_date_time)=CURDATE()
            ORDER BY d.planner_date_time ASC
            LIMIT 1
        """

        cursor.execute(today_query, tuple(params))
        row = cursor.fetchone()

        if row:
            return {
                "success": True,
                "type": "today",
                "docket_id": row["docket_id"]
            }

        # =====================================================
        # 2. UPCOMING EXECUTE
        # =====================================================
        upcoming_query = base_query + """
            AND DATE(d.planner_date_time)>CURDATE()
            ORDER BY d.planner_date_time ASC
            LIMIT 1
        """

        cursor.execute(upcoming_query, tuple(params))
        row = cursor.fetchone()

        if row:
            return {
                "success": True,
                "type": "upcoming",
                "docket_id": row["docket_id"]
            }

        # =====================================================
        # 3. PREVIOUS EXECUTE
        # =====================================================
        previous_query = base_query + """
            AND DATE(d.planner_date_time)<CURDATE()
            ORDER BY d.planner_date_time DESC
            LIMIT 1
        """

        cursor.execute(previous_query, tuple(params))
        row = cursor.fetchone()

        if row:
            return {
                "success": True,
                "type": "previous",
                "docket_id": row["docket_id"]
            }

        # =====================================================
        # 4. NOTHING FOUND
        # =====================================================
        return {
            "success": False,
            "message": "No execute found"
        }

    finally:

        cursor.close()
        db.close()


        

# =============================================================================
#  DOCKET  —  business / product / persona info helpers
# =============================================================================

@app.get("/docket/{docket_id}/business")
def get_docket_business(docket_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT business_id FROM docket WHERE docket_id=%s", (docket_id,)
        )
        docket = cursor.fetchone()
        if not docket:
            return {"success": False}
        cursor.execute(
            "SELECT * FROM businesses WHERE business_id=%s", (docket["business_id"],)
        )
        business = cursor.fetchone()
        if not business:
            return {"success": False}
        return {"success": True, "data": _clean_business(business)}
    finally:
        cursor.close()
        db.close()


@app.get("/docket/{docket_id}/product")
def get_docket_product(docket_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT product_id FROM docket WHERE docket_id=%s", (docket_id,)
        )
        d = cursor.fetchone()
        if not d or not d["product_id"]:
            return {"success": False}
        data = _fetch_product_detail(cursor, d["product_id"])
        if not data:
            return {"success": False}
        return {"success": True, "data": data}
    finally:
        cursor.close()
        db.close()


@app.get("/docket/{docket_id}/persona")
def get_docket_persona(docket_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT persona_id FROM docket WHERE docket_id=%s", (docket_id,)
        )
        d = cursor.fetchone()
        if not d or not d["persona_id"]:
            return {"success": False}

        persona_id = d["persona_id"]
        cursor.execute(
            "SELECT * FROM personas WHERE persona_id=%s", (persona_id,)
        )
        persona = cursor.fetchone()
        cursor.execute(
            "SELECT segment_type, label, value, is_active FROM persona_segments WHERE persona_id=%s",
            (persona_id,),
        )
        persona["segments"] = cursor.fetchall()
        return {"success": True, "data": persona}
    finally:
        cursor.close()
        db.close()


# =============================================================================
#  DOCKET FIELDS
# =============================================================================

@app.post("/planner/docket/{docket_id}/fields")
def save_docket_fields(
    docket_id: int,
    req: SaveFieldValuesRequest,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.executemany(
            """
            INSERT INTO media_subtype_field_value
            (docket_id, label, value, checkbox_clicked, box, field_source)
            VALUES (%s,%s,%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE
                value=VALUES(value),
                checkbox_clicked=VALUES(checkbox_clicked),
                box=VALUES(box)
            """,
            [
                (docket_id, f.label, f.value, f.checkbox_clicked, f.box, f.field_source)
                for f in req.fields
            ],
        )


        # ==========================================
        # AUTO MOVE DISCOVERY -> DRAFT
        # ==========================================

        cursor.execute(
            """
            SELECT stage, assigned_to
            FROM execute_assignments
            WHERE execute_id=%s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (docket_id,)
        )

        latest = cursor.fetchone()

        if not latest:

            cursor.execute(
                """
                INSERT INTO execute_assignments
                (
                    execute_id,
                    assigned_to,
                    assigned_by,
                    stage
                )
                VALUES (%s,%s,%s,%s)
                """,
                (
                    docket_id,
                    user_id,
                    user_id,
                    "draft"
                )
            )

        elif latest[0].lower() == "discovery":

            cursor.execute(
                """
                INSERT INTO execute_assignments
                (
                    execute_id,
                    assigned_to,
                    assigned_by,
                    stage
                )
                VALUES (%s,%s,%s,%s)
                """,
                (
                    docket_id,
                    latest[1],
                    user_id,
                    "draft"
                )
            )




        db.commit()
        return {"success": True}

    except Exception as e:
        db.rollback()
        print("SAVE FIELDS ERROR:", e)
        return {"success": False}
    finally:
        cursor.close()
        db.close()




# =============================================================================
#  Adding new subtype through user
# =============================================================================

import re


def generate_variable_name(label: str) -> str:

    label = label.lower().strip()

    label = re.sub(r"[^a-z0-9]+", "_", label)

    label = re.sub(r"_+", "_", label)

    return label.strip("_")



@app.post("/create-media-subtype")
def create_media_subtype(
    req: CreateMediaSubtypeRequest,
    user_id: int = Depends(get_current_user)
):

    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        # -----------------------------------------
        # Find media
        # -----------------------------------------

        cursor.execute(
            """
            SELECT media_id
            FROM media
            WHERE media_name=%s
            """,
            (req.mode,)
        )

        media = cursor.fetchone()

        if not media:
            raise HTTPException(400, "Invalid mode")

        # -----------------------------------------
        # Find media type
        # -----------------------------------------

        cursor.execute(
            """
            SELECT media_type_id
            FROM media_type
            WHERE media_id=%s
            AND media_type=%s
            """,
            (
                media["media_id"],
                req.media_type
            )
        )

        media_type = cursor.fetchone()

        if not media_type:
            raise HTTPException(400, "Invalid media type")

        media_type_id = media_type["media_type_id"]

        # -----------------------------------------
        # Duplicate subtype check
        # -----------------------------------------

        cursor.execute(
            """
            SELECT media_subtype_id
            FROM media_subtype
            WHERE media_type_id=%s
            AND LOWER(subtype_name)=LOWER(%s)
            """,
            (
                media_type_id,
                req.subtype
            )
        )

        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail="Subtype already exists."
            )

        # -----------------------------------------
        # Insert subtype
        # -----------------------------------------

        cursor.execute(
            """
            INSERT INTO media_subtype
            (
                media_type_id,
                subtype_name,
                description,
                user_id
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                media_type_id,
                req.subtype.strip(),
                req.description,
                user_id
            )
        )

        media_subtype_id = cursor.lastrowid

        # -----------------------------------------
        # Insert labels
        # -----------------------------------------

        for item in req.labels:

            variable_name = generate_variable_name(item.label)

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
                    "mandatory",
                    item.label.strip(),
                    item.description,
                    variable_name
                )
            )

        db.commit()

        return {
            "success": True,
            "media_subtype_id": media_subtype_id,
            "subtype_name": req.subtype,
            "message": "Subtype created successfully."
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:

        db.rollback()

        print("CREATE SUBTYPE ERROR:", e)

        raise HTTPException(
            status_code=500,
            detail="Failed to create subtype."
        )

    finally:

        cursor.close()
        db.close()







# =============================================================================
@app.get("/planner/docket/{docket_id}/fields")
def get_docket_fields(docket_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT label, value, checkbox_clicked, box ,field_source FROM media_subtype_field_value WHERE docket_id=%s",
            (docket_id,),
        )
        return {"success": True, "data": cursor.fetchall()}
    finally:
        cursor.close()
        db.close()


@app.delete("/planner/docket/{docket_id}/field/{label}")
def delete_docket_field(
    docket_id: int, label: str, user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute(
            "DELETE FROM media_subtype_field_value WHERE docket_id=%s AND label=%s AND field_source='custom'",
            (docket_id, label),
        )
        db.commit()
        return {"success": True}
    finally:
        cursor.close()
        db.close()


# =============================================================================
#  DOCKET HISTORY / MEDIA RESULTS
# =============================================================================

@app.get("/planner/docket/{docket_id}/history")
def get_docket_history(docket_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        # Ownership check
        cursor.execute(
            """
            SELECT d.docket_id FROM docket d
            JOIN businesses b ON d.business_id = b.business_id
            JOIN profiles p ON b.profile_id = p.profile_id
            WHERE d.docket_id=%s AND p.user_id=%s
            """,
            (docket_id, user_id),
        )
        if not cursor.fetchone():
            raise HTTPException(403, "Unauthorized")

        cursor.execute(
            "SELECT docket_result_id, prompt_text, created_at FROM docket_results WHERE docket_id=%s ORDER BY created_at DESC",
            (docket_id,),
        )
        return {"success": True, "data": cursor.fetchall()}
    finally:
        cursor.close()
        db.close()


@app.post("/planner/docket/{docket_id}/media-result")
def save_media_result(
    docket_id: int,
    req: dict,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor()

    try:

        # ==========================================
        # SAVE GENERATED TEXT RESULT
        # ==========================================
        cursor.execute(
            """
            INSERT INTO docket_media_results
            (
                docket_id,
                submitted_request,
                visual_text,
                created_by,
                status
            )
            VALUES (%s,%s,%s,%s,0)
            """,
            (
                docket_id,
                req.get("submitted_request"),
                req.get("visual_text"),
                user_id
            ),
        )

        docket_media_result_id = cursor.lastrowid



        # ==========================================
        # CONVERT VISUAL JSON → IMAGE PROMPT
        # ==========================================

        visual_text = req.get("visual_text")

        parsed_json = json.loads(visual_text)

        image_prompt = generate_professional_image_prompt(parsed_json)

        cursor.execute(
            """
            UPDATE docket_media_results
            SET image_prompt=%s
            WHERE docket_media_result_id=%s
            """,
            (
                image_prompt,
                docket_media_result_id
            )
        )
        db.commit()



        # ==========================================
        # generate stage
        # ==========================================
        cursor.execute(
            """
            INSERT INTO execute_assignments
            (
                execute_id,
                assigned_to,
                assigned_by,
                stage
            )
            VALUES (%s,%s,%s,%s)
            """,
            (
                docket_id,
                user_id,
                user_id,
                "generate"
            )
        )

        db.commit()

        # ==========================================
        # GENERATE AI IMAGE
        # ==========================================

        generated_image_url = generate_ai_image(
            image_prompt=image_prompt,
            logo_url=req.get("selected_logo"),
            product_url=req.get("selected_product_image")
        )

    
        # ==========================================
        # GENERATE AI CAPTION
        # ==========================================

        try:
            caption_text = generate_visual_caption(parsed_json)
        except Exception as e:
            print("CAPTION ERROR:", e)
            caption_text = ""



        # ==========================================
        # SAVE GENERATED IMAGE
        # ==========================================

        cursor.execute(
            """
            INSERT INTO docket_media_admin
            (
                docket_id,
                uploaded_url,
                message
            )
            VALUES (%s,%s,%s)
            """,
            (
                docket_id,
                generated_image_url,
                caption_text
            )
        )



        cursor.execute(
            """
            INSERT INTO execute_assignments
            (
                execute_id,
                assigned_to,
                assigned_by,
                stage
            )
            VALUES (%s,%s,%s,%s)
            """,
            (
                docket_id,
                user_id,
                user_id,
                "review"
            )
        )



        # ==========================================
        # FINAL COMMIT
        # ==========================================

        db.commit()

        return {
            "success": True,
            "image_url": generated_image_url
        }

    except Exception as e:

        db.rollback()

        print("SAVE MEDIA RESULT ERROR:", e)

        return {
            "success": False,
            "message": str(e)
        }

    finally:
        cursor.close()
        db.close()



@app.get("/planner/docket/{docket_id}/media-history")
def get_media_history(docket_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT docket_media_result_id, visual_text, created_at FROM docket_media_results WHERE docket_id=%s ORDER BY created_at DESC",
            (docket_id,),
        )
        return {"success": True, "data": cursor.fetchall()}
    finally:
        cursor.close()
        db.close()


# =============================================================================
#  EXECUTE  —  stages / assignments
# =============================================================================

@app.get("/execute/current-stage/{docket_id}")
def get_current_stage(docket_id: int):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT stage FROM execute_assignments WHERE execute_id=%s ORDER BY created_at DESC LIMIT 1",
            (docket_id,),
        )
        row = cursor.fetchone()
        return {"success": True, "stage": row["stage"] if row else "discovery"}
    finally:
        cursor.close()
        db.close()








@app.get("/execute/current-owner/{docket_id}")
def get_current_owner(
    docket_id: int,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT assigned_to
            FROM execute_assignments
            WHERE execute_id=%s
            ORDER BY assignment_id DESC
            LIMIT 1
            """,
            (docket_id,)
        )

        row = cursor.fetchone()

        return {
            "success": True,
            "assigned_to":
                row["assigned_to"]
                if row
                else user_id,
            "current_user":
                user_id
        }

    finally:
        cursor.close()
        db.close()





@app.get("/process-stages/{current_stage}")
def get_next_stages(current_stage: str):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT next_stage FROM process_stage WHERE current_stage=%s", (current_stage,)
        )
        return {"success": True, "data": [r["next_stage"] for r in cursor.fetchall()]}
    finally:
        cursor.close()
        db.close()


@app.post("/execute/assign")
def assign_execute(
    req: AssignExecuteRequest,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO execute_assignments (execute_id, assigned_to, assigned_by, stage) VALUES (%s,%s,%s,%s)",
            (req.docket_id, req.user_id, user_id, req.stage),
        )
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        print("ASSIGN ERROR:", e)
        return {"success": False}
    finally:
        cursor.close()
        db.close()


@app.get("/execute/{docket_id}/assignment-history")
def get_assignment_history(docket_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT ea.assignment_id, ea.stage, ea.created_at,
                   u1.email AS assigned_by_email,
                   u2.email AS assigned_to_email
            FROM execute_assignments ea
            LEFT JOIN users u1 ON ea.assigned_by = u1.user_id
            LEFT JOIN users u2 ON ea.assigned_to = u2.user_id
            WHERE ea.execute_id=%s
            ORDER BY ea.created_at ASC
            """,
            (docket_id,),
        )
        return {"success": True, "data": cursor.fetchall()}
    finally:
        cursor.close()
        db.close()




# =============================================================================
#  Pro Button Working
# =============================================================================
import random


@app.post("/execute/assign-pro/{docket_id}")
def assign_pro_user(
    docket_id: int,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        # ---------------------------------------------------------
        # 1. Find all active users whose type_of_user = 1
        # ---------------------------------------------------------
        cursor.execute(
            """
            SELECT
                user_id,
                email
            FROM users
            WHERE type_of_user = 1
              AND is_active = 1
            """
        )

        pro_users = cursor.fetchall()

        # ---------------------------------------------------------
        # 2. Make sure at least one Pro user exists
        # ---------------------------------------------------------
        if not pro_users:
            raise HTTPException(
                status_code=404,
                detail="No active Pro users available"
            )

        # ---------------------------------------------------------
        # 3. Randomly select one Pro user
        # ---------------------------------------------------------
        selected_user = random.choice(pro_users)

        selected_user_id = selected_user["user_id"]
        selected_user_email = selected_user["email"]

        # ---------------------------------------------------------
        # 4. Insert assignment
        #
        # Same logic as your existing /execute/assign endpoint.
        #
        # execute_id  = current docket
        # assigned_to = randomly selected Pro user
        # assigned_by = currently logged-in user
        # stage       = "pro"
        # ---------------------------------------------------------
        cursor.execute(
            """
            INSERT INTO execute_assignments
            (
                execute_id,
                assigned_to,
                assigned_by,
                stage
            )
            VALUES (%s, %s, %s, %s)
            """,
            (
                docket_id,
                selected_user_id,
                user_id,
                "pro"
            )
        )

        # ---------------------------------------------------------
        # 5. Commit
        # ---------------------------------------------------------
        db.commit()

        # ---------------------------------------------------------
        # 6. Return selected Pro user
        # ---------------------------------------------------------
        return {
            "success": True,
            "message": "Execute assigned to Pro user successfully",
            "docket_id": docket_id,
            "assigned_user_id": selected_user_id,
            "assigned_user_email": selected_user_email,
            "stage": "pro"
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:

        db.rollback()

        print(
            "ASSIGN PRO ERROR:",
            e
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        cursor.close()
        db.close()


# =============================================================================
#  OCCASIONS
# =============================================================================


@app.post("/planner/occasion")
def create_occasion(
    req: CreateOccasionRequest,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        business_id = require_business(user_id, db)
        cursor.execute(
            "INSERT INTO occasions (business_id, created_by, title, occasion_date, description, color) VALUES (%s,%s,%s,%s,%s,%s)",
            (business_id, user_id, req.title, req.occasion_date, req.description, req.color),
        )
        db.commit()
        return {"success": True, "occasion_id": cursor.lastrowid}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("CREATE OCCASION ERROR:", e)
        return {"success": False}
    finally:
        cursor.close()
        db.close()


@app.get("/planner/occasions")
def get_occasions(year: int, month: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT b.business_id FROM businesses b
            JOIN profiles p ON b.profile_id = p.profile_id
            WHERE p.user_id=%s
            """,
            (user_id,),
        )
        business = cursor.fetchone()
        if not business:
            return {"success": True, "data": []}

        start_date = date(year, month, 1)
        end_date = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)

        cursor.execute(
            """
            SELECT occasion_id, title, occasion_date, description, color
            FROM occasions
            WHERE business_id=%s AND occasion_date>=%s AND occasion_date<%s
            ORDER BY occasion_date ASC
            """,
            (business["business_id"], start_date, end_date),
        )
        return {"success": True, "data": cursor.fetchall()}
    finally:
        cursor.close()
        db.close()


@app.put("/planner/occasion/{occasion_id}")
def update_occasion(
    occasion_id: int,
    req: UpdateOccasionRequest,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT o.occasion_id FROM occasions o
            JOIN businesses b ON o.business_id = b.business_id
            JOIN profiles p ON b.profile_id = p.profile_id
            WHERE o.occasion_id=%s AND p.user_id=%s
            """,
            (occasion_id, user_id),
        )
        if not cursor.fetchone():
            raise HTTPException(403, "Unauthorized")

        update_fields, values = [], []
        if req.title:
            update_fields.append("title=%s"); values.append(req.title)
        if req.description is not None:
            update_fields.append("description=%s"); values.append(req.description)
        if req.color:
            update_fields.append("color=%s"); values.append(req.color)

        if not update_fields:
            return {"success": True}

        values.append(occasion_id)
        cursor.execute(
            f"UPDATE occasions SET {', '.join(update_fields)} WHERE occasion_id=%s",
            values,
        )
        db.commit()
        return {"success": True}
    except HTTPException:
        raise
    finally:
        cursor.close()
        db.close()


@app.delete("/planner/occasion/{occasion_id}")
def delete_occasion(occasion_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute(
            """
            DELETE o FROM occasions o
            JOIN businesses b ON o.business_id = b.business_id
            JOIN profiles p ON b.profile_id = p.profile_id
            WHERE o.occasion_id=%s AND p.user_id=%s
            """,
            (occasion_id, user_id),
        )
        db.commit()
        return {"success": True}
    finally:
        cursor.close()
        db.close()






@app.get("/planner/all-occasions")
def get_all_occasions(user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        business_id = require_business(
            user_id,
            db
        )

        cursor.execute("""
            SELECT occasion_id, title, occasion_date
            FROM occasions
            WHERE business_id=%s
            ORDER BY occasion_date DESC
        """, (business_id,))

        return {
            "success": True,
            "data": cursor.fetchall()
        }

    finally:
        cursor.close()
        db.close()


# =============================================================================
#  FILE UPLOADS  —  image / description
# =============================================================================

# =============================================================================
#  FILE UPLOADS  —  image / description
# =============================================================================

@app.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user),
):
    

    print("UPLOAD API HITTT")
    try:

        ext = file.filename.rsplit(".", 1)[-1].lower()

        content_types = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp"
        }

        content_type = content_types.get(ext, "image/jpeg")

        key = f"userMedia/{user_id}/{uuid.uuid4()}.{ext}"

        contents = await file.read()

        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=contents,
            ContentType=content_type
        )

        return {
            "success": True,
            "url": f"{S3_BASE_URL}/{key}"
        }

    except Exception as e:

        import traceback

        print("IMAGE UPLOAD ERROR:")
        traceback.print_exc()

        return {
            "success": False,
            "message": str(e)
        }


@app.post("/upload-description")
async def upload_description(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user),
):
    try:
        allowed = {"txt", "pdf", "doc", "docx", "md"}
        ext = file.filename.rsplit(".", 1)[-1].lower()
        if ext not in allowed:
            raise HTTPException(400, "Invalid file type")
        key = f"userDescriptions/{user_id}/{uuid.uuid4()}.{ext}"
        s3.upload_fileobj(
            file.file, BUCKET_NAME, key,
            ExtraArgs={"ContentType": file.content_type},
        )
        return {"success": True, "url": f"{S3_BASE_URL}/{key}"}
    except HTTPException:
        raise
    except Exception as e:
        print("DESCRIPTION UPLOAD ERROR:", e)
        return {"success": False}


# =============================================================================
#  ADMIN  —  requests / docket detail / visual upload / message
# =============================================================================

@app.get("/admin/requests")
def get_admin_requests(user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT dmr.docket_media_result_id AS id, dmr.docket_id,
                   u.user_id, u.email AS username,
                   dmr.submitted_request, dmr.created_at AS request_date,
                   'Pending' AS status
            FROM docket_media_results dmr
            JOIN users u ON dmr.created_by = u.user_id
            ORDER BY dmr.created_at DESC
            """
        )
        return {"success": True, "data": cursor.fetchall()}
    finally:
        cursor.close()
        db.close()


@app.get("/admin/docket/{docket_id}")
def get_admin_docket(docket_id: int):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT d.*, m.media_name, mt.media_type, ms.subtype_name
            FROM docket d
            LEFT JOIN media m ON d.media_id = m.media_id
            LEFT JOIN media_type mt ON d.media_type_id = mt.media_type_id
            LEFT JOIN media_subtype ms ON d.media_subtype_id = ms.media_subtype_id
            WHERE d.docket_id=%s
            """,
            (docket_id,),
        )
        docket = cursor.fetchone()
        if not docket:
            return {"success": False}

        product = None
        if docket["product_id"]:
            cursor.execute(
                "SELECT product_id, product_name FROM products WHERE product_id=%s",
                (docket["product_id"],),
            )
            product = cursor.fetchone()

        persona = None
        if docket["persona_id"]:
            cursor.execute(
                "SELECT persona_id, persona_name FROM personas WHERE persona_id=%s",
                (docket["persona_id"],),
            )
            persona = cursor.fetchone()

        cursor.execute(
            "SELECT label, value, box FROM media_subtype_field_value WHERE docket_id=%s",
            (docket_id,),
        )
        rows = cursor.fetchall()

        cursor.execute(
            "SELECT admin_media_id, uploaded_url, message, created_at FROM docket_media_admin WHERE docket_id=%s ORDER BY created_at DESC",
            (docket_id,),
        )
        visual_history = cursor.fetchall()

        cursor.execute(
            "SELECT input_json FROM chatbot_history WHERE docket_id=%s ORDER BY created_datetime ASC",
            (docket_id,),
        )
        chat_history = [
            {"user": json.loads(r["input_json"]).get("message")}
            for r in cursor.fetchall()
        ]

        return {
            "success": True,
            "data": {
                **docket,
                "product": product,
                "persona": persona,
                "mandatory_fields": [r for r in rows if r["box"] == "mandatory"],
                "optional_fields": [r for r in rows if r["box"] == "optional"],
                "visual_history": visual_history,
                "chat_history": chat_history,
            },
        }
    finally:
        cursor.close()
        db.close()


@app.post("/admin/docket/{docket_id}/upload-visual")
def upload_visual_result(
    docket_id: int,
    req: UploadVisualRequest,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO docket_media_admin (docket_id, uploaded_url, message) VALUES (%s,%s,%s)",
            (docket_id, req.uploaded_url, req.message),
        )
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        print("ADMIN UPLOAD ERROR:", e)
        return {"success": False}
    finally:
        cursor.close()
        db.close()


@app.get("/planner/docket/{docket_id}/visual")
def get_visual_result(docket_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT admin_media_id, uploaded_url, message FROM docket_media_admin WHERE docket_id=%s ORDER BY created_at DESC LIMIT 1",
            (docket_id,),
        )
        row = cursor.fetchone()
        return {
            "success": True,
            "admin_media_id": row["admin_media_id"] if row else None,
            "url": row["uploaded_url"] if row else None,
            "message": row["message"] if row else None,
        }
    finally:
        cursor.close()
        db.close()


@app.post("/admin/docket/{docket_id}/message")
def update_visual_message(
    docket_id: int,
    req: UpdateVisualMessageRequest,
    user_id: int = Depends(get_current_user),
):
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute(
            "UPDATE docket_media_admin SET message=%s WHERE docket_id=%s ORDER BY created_at DESC LIMIT 1",
            (req.message, docket_id),
        )
        db.commit()
        return {"success": True}
    finally:
        cursor.close()
        db.close()


# =============================================================================
#  FEEDBACK
# =============================================================================

@app.post("/feedback")
def add_feedback(req: FeedbackRequest, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT email FROM users WHERE user_id=%s", (user_id,))
        user = cursor.fetchone()
        role = "admin" if user and user["email"] == os.getenv("ADMIN_EMAIL") else "user"

        cursor.execute(
            "INSERT INTO feedback_history (docket_id, admin_media_id, user_id, feedback, role) VALUES (%s,%s,%s,%s,%s)",
            (req.docket_id, req.admin_media_id, user_id, req.feedback, role),
        )
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        print("FEEDBACK ERROR:", e)
        return {"success": False}
    finally:
        cursor.close()
        db.close()


@app.get("/feedback/{admin_media_id}")
def get_feedback(admin_media_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT f.feedback_history_id, f.feedback, f.role, f.created_at, u.email
            FROM feedback_history f
            JOIN users u ON f.user_id = u.user_id
            WHERE f.admin_media_id=%s
            ORDER BY f.created_at ASC
            """,
            (admin_media_id,),
        )
        return {"success": True, "data": cursor.fetchall()}
    finally:
        cursor.close()
        db.close()


@app.get("/feedback/docket/{docket_id}")
def get_docket_feedback(docket_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT f.feedback_history_id, f.feedback, f.role, f.created_at,
                   f.admin_media_id, u.email,
                   dma.uploaded_url AS image_url
            FROM feedback_history f
            JOIN users u ON f.user_id = u.user_id
            LEFT JOIN docket_media_admin dma ON f.admin_media_id = dma.admin_media_id
            WHERE f.docket_id=%s
            ORDER BY f.created_at ASC
            """,
            (docket_id,),
        )
        return {"success": True, "data": cursor.fetchall()}
    finally:
        cursor.close()
        db.close()


@app.get("/linkedin/auth")
def linkedin_auth(user_id: int = Depends(get_current_user)):
    url = (
        "https://www.linkedin.com/oauth/v2/authorization"
        f"?response_type=code"
        f"&client_id={LINKEDIN_CLIENT_ID}"
        f"&redirect_uri={LINKEDIN_REDIRECT_URI}"
        f"&scope=openid profile w_member_social email"
        f"&state={user_id}"
    )
    return {"url": url}





@app.get("/linkedin/callback")
def linkedin_callback(code: str, state: str):
    db = get_db()
    cursor = db.cursor()

    try:
        user_id = int(state)

        # 1. Exchange code → access_token
        res = requests.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": LINKEDIN_REDIRECT_URI,
                "client_id": LINKEDIN_CLIENT_ID,
                "client_secret": LINKEDIN_CLIENT_SECRET,
            },
        )

        data = res.json()

        if "access_token" not in data:
            raise Exception(data)

        access_token = data["access_token"]
        expires_in = data["expires_in"]

        # 2. Get LinkedIn profile
        profile = requests.get(
            "https://api.linkedin.com/v2/me",
            headers={"Authorization": f"Bearer {access_token}"}
        ).json()

        linkedin_urn = f"urn:li:person:{profile['id']}"

        # 3. Get business_id
        business_id = require_business(user_id, db)

        # 4. SAVE in DB
        cursor.execute("""
            INSERT INTO linkedin_accounts (business_id, linkedin_urn, access_token, expires_at)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                linkedin_urn=VALUES(linkedin_urn),
                access_token=VALUES(access_token),
                expires_at=VALUES(expires_at),
                is_active=1
        """, (
            business_id,
            linkedin_urn,
            access_token,
            datetime.utcnow() + timedelta(seconds=expires_in)
        ))

        db.commit()

        return {"success": True, "message": "LinkedIn connected"}

    except Exception as e:
        db.rollback()
        print("LINKEDIN ERROR:", e)
        raise HTTPException(500, "LinkedIn connection failed")

    finally:
        cursor.close()
        db.close()




from linkedin_service import create_post_entry


@app.post("/linkedin/post/{docket_id}")
def post_to_linkedin_api(docket_id: int, user_id: int = Depends(get_current_user)):

    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # ✅ ADD THIS BLOCK FIRST
        cursor.execute("""
            SELECT d.docket_id
            FROM docket d
            JOIN businesses b ON d.business_id = b.business_id
            JOIN profiles p ON b.profile_id = p.profile_id
            WHERE d.docket_id=%s AND p.user_id=%s
        """, (docket_id, user_id))

        if not cursor.fetchone():
            raise HTTPException(403, "Unauthorized")

            
        # Get business_id
        cursor.execute("""
            SELECT b.business_id
            FROM businesses b
            JOIN profiles p ON b.profile_id = p.profile_id
            WHERE p.user_id = %s
        """, (user_id,))
        biz = cursor.fetchone()

        if not biz:
            raise HTTPException(400, "Business not found")

        business_id = biz["business_id"]


        # ✅ Check if LinkedIn is connected
        cursor.execute("""
            SELECT access_token, expires_at
            FROM linkedin_accounts
            WHERE business_id=%s AND is_active=1
        """, (business_id,))

        account = cursor.fetchone()

        if not account:
            raise HTTPException(400, "LINKEDIN_NOT_CONNECTED")

        if account["expires_at"] < datetime.utcnow():
            raise HTTPException(400, "LINKEDIN_TOKEN_EXPIRED")

        # Get content
        cursor.execute("""
            SELECT prompt_text
            FROM docket_results
            WHERE docket_id=%s
            ORDER BY created_at DESC
            LIMIT 1
        """, (docket_id,))

        result = cursor.fetchone()

        if not result:
            raise HTTPException(404, "No generated content")

        post_id = create_post_entry(
            business_id,
            user_id,
            docket_id,
            result["prompt_text"]
        )

        return {"success": True, "post_id": post_id}

    finally:
        cursor.close()
        db.close()



@app.get("/planner/stage-counts")
def get_stage_counts(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,

    stage: Optional[str] = None,

    product_id: Optional[int] = None,
    persona_id: Optional[int] = None,
    occasion_id: Optional[int] = None,

    media_type: Optional[str] = None,
    subtype_name: Optional[str] = None,

    search: Optional[str] = None,

    user_id: int = Depends(get_current_user)
):

    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        business_id = require_business_for_network_user(
            user_id,
            db
        )


        cursor.execute(
            """
            SELECT primary_user_id
            FROM network
            WHERE secondary_user_id = %s
            LIMIT 1
            """,
            (user_id,)
        )

        mapping = cursor.fetchone()






        query = """
            SELECT
                d.docket_id,
                COALESCE(ea.stage, 'discovery') AS current_stage
            FROM docket d

            LEFT JOIN media m
                ON d.media_id = m.media_id

            LEFT JOIN media_type mt
                ON d.media_type_id = mt.media_type_id

            LEFT JOIN media_subtype ms
                ON d.media_subtype_id = ms.media_subtype_id

            LEFT JOIN products p
                ON d.product_id = p.product_id

            LEFT JOIN personas pe
                ON d.persona_id = pe.persona_id

            LEFT JOIN (
                SELECT ea1.*
                FROM execute_assignments ea1
                WHERE ea1.assignment_id = (
                    SELECT ea2.assignment_id
                    FROM execute_assignments ea2
                    WHERE ea2.execute_id = ea1.execute_id
                    ORDER BY ea2.created_at DESC
                    LIMIT 1
                )
            ) ea
            ON ea.execute_id = d.docket_id

            WHERE d.business_id = %s
        """

        params = [business_id]

        query, params = apply_execute_filters(

            query=query,
            params=params,

            mapping=mapping,
            user_id=user_id,

            product_id=product_id,
            persona_id=persona_id,
            occasion_id=occasion_id,

            media_type=media_type,
            subtype_name=subtype_name,

            search=search,

            start_date=start_date,
            end_date=end_date,

            stage=stage

        )

        cursor.execute(query, tuple(params))

        rows = cursor.fetchall()

        counts = {
            "discovery": 0,
            "draft": 0,
            "generate": 0,
            "review": 0,
            "approve": 0,
            "publish": 0,
            "closed": 0,
            "rejected": 0
        }

        for row in rows:

            stage = (row["current_stage"] or "discovery").lower()

            if stage == "approval":
                stage = "approve"

            if stage in counts:
                counts[stage] += 1

        return {
            "success": True,
            "data": counts
        }

    finally:
        cursor.close()
        db.close()




@app.put("/planner/docket/{docket_id}")
def update_docket(
    docket_id: int,
    req: UpdateDocketRequest,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor()

    try:

        cursor.execute(
            """
            UPDATE docket
                SET
                    title=%s,
                    product_id=%s,
                    persona_id=%s,
                    occasion_id=%s,
                    uploaded_date_time=%s,
                    execute_description=%s,
                    visual_elements=%s,
                    summary=%s
                WHERE docket_id=%s
            """,
            (
                req.title,
                req.product_id,
                req.persona_id,
                req.occasion_id,
                req.uploaded_date_time,
                req.execute_description,
                req.visual_elements,
                req.summary,
                docket_id
            )
        )


        cursor.execute(
            """
            SELECT
                business_id,
                product_id,
                persona_id,
                occasion_id,
                media_subtype_id
            FROM docket
            WHERE docket_id=%s
            """,
            (docket_id,)
        )

        docket = cursor.fetchone()


        cursor.execute(
            """
            DELETE FROM media_subtype_field_value
            WHERE docket_id=%s
            """,
            (docket_id,)
        )



        db.commit()

        return {"success": True}

    except Exception as e:
        db.rollback()
        import traceback

        print("UPDATE DOCKET ERROR")
        traceback.print_exc()

        return {
            "success": False,
            "message": str(e)
        }

    finally:
        cursor.close()
        db.close()





@app.get("/download-image")
def download_image(key: str):

    url = s3.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": BUCKET_NAME,
            "Key": key,
            "ResponseContentDisposition":
                'attachment'
        },
        ExpiresIn=300
    )

    return {"url": url}






#########################################################################################
#########################################################################################
