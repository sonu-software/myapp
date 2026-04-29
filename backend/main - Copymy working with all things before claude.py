from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from database import get_db
from auth import hash_password, verify_password, create_token, get_current_user

from business_rules import get_categories, get_subcategories
from subcategory_rules import SUBCATEGORY_RULES
from prompts import build_prompt

############can use later for gemini############################
from gemini import ask_gemini
###############################################################
from openai_client import ask_openai

from typing import List
from mysql.connector import IntegrityError


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    docket_id: int
    message: str
    mode: Optional[str] = ""
    mediaType: Optional[str] = ""
    subType: Optional[str] = ""

    business: Optional[str] = ""
    product: Optional[str] = ""
    persona: Optional[str] = ""

    fields: Optional[List[str]] = []

import json



import boto3
import uuid
import os

import os
from dotenv import load_dotenv

load_dotenv()

s3 = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("AWS_SECRET_KEY")
)

BUCKET_NAME = os.getenv("S3_BUCKET")









@app.post("/chat")
async def chat_with_ai(
    req: ChatRequest,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor()

    try:

        #field_values = ask_gemini(
        field_values = ask_openai(
            message=req.message,
            context={
                "mode": req.mode,
                "mediaType": req.mediaType,
                "subType": req.subType,
                "business": req.business,
                "product": req.product,
                "persona": req.persona,
                "fields": req.fields
            }
        )

        # 🔥 SAVE CHAT HISTORY
        cursor.execute("""
            INSERT INTO chatbot_history
            (docket_id, input_json, output_json)
            VALUES (%s,%s,%s)
        """, (
            req.docket_id,
            json.dumps({
                "message": req.message,
                "mode": req.mode,
                "mediaType": req.mediaType,
                "subType": req.subType
            }),
            json.dumps(field_values)
        ))

        db.commit()

        return {
            "success": True,
            "fields": field_values
        }

    except Exception as e:
        print("🔥 CHAT ERROR:", e)
        return {"success": False}

    finally:
        cursor.close()
        db.close()




@app.get("/planner/docket/{docket_id}/chat-history")
def get_chat_history(
    docket_id: int,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute("""
            SELECT input_json, output_json, created_datetime
            FROM chatbot_history
            WHERE docket_id = %s
            ORDER BY created_datetime ASC
        """, (docket_id,))

        rows = cursor.fetchall()

        history = []

        for row in rows:

            input_data = json.loads(row["input_json"])
            output_data = json.loads(row["output_json"])

            history.append({
                "user": input_data.get("message"),
                "ai": output_data
            })

        return {
            "success": True,
            "data": history
        }

    finally:
        cursor.close()
        db.close()






class SignupRequest(BaseModel):
    email: str
    mobile: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str



@app.post("/signup")
def signup(req: SignupRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT user_id FROM users WHERE email=%s",
            (req.email,)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="User already exists")

        hashed = hash_password(req.password)

        # 1️⃣ Create user
        cursor.execute(
            """
            INSERT INTO users (email, mobile, password_hash)
            VALUES (%s, %s, %s)
            """,
            (req.email, req.mobile, hashed)
        )
        user_id = cursor.lastrowid

        # 2️⃣ Create profile
        cursor.execute(
            """
            INSERT INTO profiles (user_id)
            VALUES (%s)
            """,
            (user_id,)
        )
        profile_id = cursor.lastrowid

        db.commit()
        return {"success": True}

    finally:
        cursor.close()
        db.close()





#############################################################
#OTP services
#########################################################
from otp_service import generate_otp, send_otp_email

@app.post("/send-otp")
def send_otp_api(req: SignupRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # check existing user
        cursor.execute("SELECT * FROM users WHERE email=%s", (req.email,))
        if cursor.fetchone():
            raise HTTPException(400, "Email already exists")

        otp = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=5)

        hashed = hash_password(req.password)

        # delete old OTP
        cursor.execute("DELETE FROM signup_otp WHERE email=%s", (req.email,))

        cursor.execute("""
            INSERT INTO signup_otp (email, mobile, password_hash, otp, expires_at)
            VALUES (%s,%s,%s,%s,%s)
        """, (req.email, req.mobile, hashed, otp, expires_at))

        db.commit()

        # send email
        send_otp_email(req.email, otp)

        return {"success": True, "message": "OTP sent"}

    finally:
        cursor.close()
        db.close()



class VerifyOtpRequest(BaseModel):
    email: str
    otp: str


@app.post("/verify-otp")
def verify_otp_api(req: VerifyOtpRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT * FROM signup_otp
            WHERE email=%s AND otp=%s
        """, (req.email, req.otp))

        record = cursor.fetchone()

        if not record:
            raise HTTPException(400, "Invalid OTP")

        if datetime.utcnow() > record["expires_at"]:
            raise HTTPException(400, "OTP expired")

        # create user
        cursor.execute("""
            INSERT INTO users (email, mobile, password_hash)
            VALUES (%s,%s,%s)
        """, (
            record["email"],
            record["mobile"],
            record["password_hash"]
        ))

        user_id = cursor.lastrowid

        # create profile
        cursor.execute("""
            INSERT INTO profiles (user_id)
            VALUES (%s)
        """, (user_id,))

        # delete otp
        cursor.execute("DELETE FROM signup_otp WHERE email=%s", (req.email,))

        db.commit()

        return {"success": True}

    finally:
        cursor.close()
        db.close()





class ForgotPasswordRequest(BaseModel):
    email: str


@app.post("/forgot-password/send-otp")
def forgot_send_otp(req: ForgotPasswordRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # check user exists
        cursor.execute("SELECT user_id FROM users WHERE email=%s", (req.email,))
        user = cursor.fetchone()

        if not user:
            raise HTTPException(404, "User not found")

        otp = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=5)

        # delete old otp
        cursor.execute("DELETE FROM forgot_password_otp WHERE email=%s", (req.email,))

        cursor.execute("""
            INSERT INTO forgot_password_otp (email, otp, expires_at)
            VALUES (%s,%s,%s)
        """, (req.email, otp, expires_at))

        db.commit()

        send_otp_email(req.email, otp)

        return {"success": True, "message": "OTP sent"}

    finally:
        cursor.close()
        db.close()





class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str


@app.post("/forgot-password/reset")
def reset_password(req: ResetPasswordRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT * FROM forgot_password_otp
            WHERE email=%s AND otp=%s
        """, (req.email, req.otp))

        record = cursor.fetchone()

        if not record:
            raise HTTPException(400, "Invalid OTP")

        if datetime.utcnow() > record["expires_at"]:
            raise HTTPException(400, "OTP expired")

        # update password
        hashed = hash_password(req.new_password)

        cursor.execute("""
            UPDATE users
            SET password_hash=%s
            WHERE email=%s
        """, (hashed, req.email))

        # delete otp
        cursor.execute("DELETE FROM forgot_password_otp WHERE email=%s", (req.email,))

        db.commit()

        return {"success": True, "message": "Password reset successful"}

    finally:
        cursor.close()
        db.close()








            








@app.post("/login")
def login(req: LoginRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT user_id, password_hash FROM users WHERE email=%s",
            (req.email,)
        )
        user = cursor.fetchone()

        if not user or not verify_password(req.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = create_token(user["user_id"])
        expires_at = datetime.utcnow() + timedelta(hours=24)

        cursor.execute(
            """
            INSERT INTO auth_tokens (user_id, jwt_token, expires_at)
            VALUES (%s, %s, %s)
            """,
            (user["user_id"], token, expires_at)
        )

        db.commit()

        return {
            "access_token": token
        }

    finally:
        cursor.close()
        db.close()






class AddSecondaryUserRequest(BaseModel):
    email: str


@app.post("/network/add-user")
def add_secondary_user(
    req: AddSecondaryUserRequest,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # 1️⃣ get primary user email
        cursor.execute("""
            SELECT email FROM users WHERE user_id = %s
        """, (user_id,))
        primary = cursor.fetchone()

        if not primary:
            raise HTTPException(404, "Primary user not found")

        primary_email = primary["email"]

        # 2️⃣ get secondary user
        cursor.execute("""
            SELECT user_id, email FROM users WHERE email = %s
        """, (req.email,))
        secondary = cursor.fetchone()

        if not secondary:
            raise HTTPException(404, "User not found")

        if secondary["user_id"] == user_id:
            raise HTTPException(400, "Cannot add yourself")

        # 3️⃣ insert into network
        cursor.execute("""
            INSERT IGNORE INTO network (
                primary_user_id,
                primary_email,
                secondary_user_id,
                secondary_email,
                role
            )
            VALUES (%s,%s,%s,%s,'secondary')
        """, (
            user_id,
            primary_email,
            secondary["user_id"],
            secondary["email"]
        ))

        db.commit()

        return {"success": True}

    finally:
        cursor.close()
        db.close()















# -------------------------------
# CATEGORY APIs
# -------------------------------
@app.get("/categories")
def fetch_categories():
    return get_categories()


@app.get("/subcategories/{category}")
def fetch_subcategories(category: str):
    return get_subcategories(category)

'''
@app.get("/rules/{subcategory}")
def get_subcategory_rules(subcategory: str):
    rules = SUBCATEGORY_RULES.get(subcategory)
    if not rules:
        return {"success": False}
    return {"success": True, "data": rules}
'''

# -------------------------------
# REQUEST MODEL
# -------------------------------
from typing import Dict

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




# -------------------------------
# GENERATE PROMPT
# -------------------------------
@app.post("/generate")
async def generate_prompt(
    req: GenerateRequest,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor()

    try:
    # 1️⃣ Build base prompt
        base_prompt = build_prompt(req, req.category)

        # 2️⃣ Fetch dynamic fields
        cursor.execute("""
            SELECT label, value, box
            FROM media_subtype_field_value
            WHERE docket_id = %s
            AND checkbox_clicked = 1
            AND field_source = 'custom'
        """, (req.docket_id,))

        rows = cursor.fetchall()

        mandatory_block = ""
        optional_block = ""

        for label, value, box in rows:
            if value and value.strip():
                if box == "mandatory":
                    mandatory_block += f"{label}: {value}\n"
                else:
                    optional_block += f"{label}: {value}\n"

        # 3️⃣ Final prompt
        prompt = f"""
    {base_prompt}

    {mandatory_block if mandatory_block else ""}

    {optional_block if optional_block else ""}
    """.strip()

        # Save
        cursor.execute("""
            INSERT INTO docket_results (
                docket_id,
                prompt_text,
                created_by
            )
            VALUES (%s, %s, %s)
        """, (
            req.docket_id,
            prompt,
            user_id
        ))

        db.commit()

        return {
            "success": True,
            "output": prompt
        }

    except Exception as e:
        print("🔥 GENERATE ERROR:", e)
        return {"success": False}

    finally:
        cursor.close()
        db.close()





def is_secondary(user_id: int, db):
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT network_id
            FROM network
            WHERE secondary_user_id = %s
            LIMIT 1
        """, (user_id,))

        result = cursor.fetchone()
        return result is not None

    finally:
        cursor.close()








def require_business(user_id: int, db):
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT b.business_id
            FROM businesses b
            JOIN profiles p ON b.profile_id = p.profile_id
            WHERE p.user_id = %s
        """, (user_id,))

        business = cursor.fetchone()

        if not business:
            raise HTTPException(
                status_code=400,
                detail="BUSINESS_REQUIRED"
            )

        return business["business_id"]

    finally:
        cursor.close()








class PersonaSegment(BaseModel):
    segment_type: str
    label: str
    value: str
    is_active: bool

class CreatePersonaRequest(BaseModel):
    persona_id: Optional[int] = None
    persona_name: str
    segments: List[PersonaSegment]




@app.post("/personas")
def create_persona(
    req: CreatePersonaRequest,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)



    try:
        # 1️⃣ Get user's business
        business_id = require_business(user_id, db)

        if req.persona_id:

            persona_id = req.persona_id

            cursor.execute("""
                UPDATE personas
                SET persona_name=%s
                WHERE persona_id=%s
                AND business_id=%s
            """, (
                req.persona_name,
                persona_id,
                business_id
            ))

        else:

            cursor.execute("""
                INSERT INTO personas (business_id, persona_name)
                VALUES (%s,%s)
            """, (
                business_id,
                req.persona_name
            ))

            persona_id = cursor.lastrowid

        # 3️⃣ Refresh segments (not deleting persona, only segments)
        cursor.execute("""
            DELETE FROM persona_segments
            WHERE persona_id = %s
        """, (persona_id,))

        for seg in req.segments:
            cursor.execute("""
                INSERT INTO persona_segments
                (persona_id, segment_type, label, value, is_active)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                persona_id,
                seg.segment_type,
                seg.label,
                seg.value,
                seg.is_active
            ))

        db.commit()

        return {
            "success": True,
            "persona_id": persona_id
        }
    

    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Persona with this name already exists."
        )
    

    finally:
        cursor.close()
        db.close()





@app.get("/personas")
def get_personas(user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        business_id = require_business(user_id, db)

        cursor.execute("""
            SELECT * FROM personas
            WHERE business_id = %s
        """, (business_id,))

        personas = cursor.fetchall()

        for persona in personas:
            cursor.execute("""
                SELECT segment_type, label, value, is_active
                FROM persona_segments
                WHERE persona_id = %s
            """, (persona["persona_id"],))
            persona["segments"] = cursor.fetchall()

        return {"success": True, "data": personas}

    finally:
        cursor.close()
        db.close()




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
    


@app.post("/setup-business")
def setup_business(
    req: BusinessSetupRequest,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)


    try:
        # get profile
        cursor.execute(
            "SELECT profile_id FROM profiles WHERE user_id = %s",
            (user_id,)
        )
        profile = cursor.fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")

        profile_id = profile["profile_id"]

        # update or insert business
        cursor.execute(
        """
        INSERT INTO businesses (
            profile_id,
            business_name,
            description,
            description_file_url,
            business_type,
            industry,
            year_established,

            owner_name,
            email,
            phone,
            logo_url,
            logo_placement,

            website_url,
            brand_color,

            street_address,
            city,
            state,
            country,
            postal_code,

            registration_number,
            tax_id,

            default_currency,
            timezone,
            fiscal_year_start,

            language_preference,
            notification_preference,

            terms_accepted,
            privacy_accepted,

            is_completed
        )
        VALUES (
            %s,%s,%s,%s,%s,%s,%s,
            %s,%s,%s,%s,%s,
            %s,%s,
            %s,%s,%s,%s,%s,
            %s,%s,
            %s,%s,%s,
            %s,%s,
            %s,%s,
            TRUE
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
            profile_id,
            req.business_name,
            req.description,
            req.description_file_url,
            req.business_type,
            req.industry,
            req.year_established,

            req.owner_name,
            req.email,
            req.phone,
            req.logo_url,
            req.logo_placement,

            req.website_url,
            req.brand_color,

            req.street_address,
            req.city,
            req.state,
            req.country,
            req.postal_code,

            req.registration_number,
            req.tax_id,

            req.default_currency,
            req.timezone,
            req.fiscal_year_start,

            req.language_preference,
            req.notification_preference,

            req.terms_accepted,
            req.privacy_accepted
        )
    )

        db.commit()

        # 🔥 ADD ELEVANTIA ADMIN TO NETWORK

        cursor.execute("""
            SELECT user_id, email
            FROM users
            WHERE email = %s
        """, (os.getenv("ELEVANTIA_ADMIN_EMAIL"),))

        admin_user = cursor.fetchone()

        if admin_user:

            # get primary email
            cursor.execute("""
                SELECT email FROM users WHERE user_id = %s
            """, (user_id,))
            primary = cursor.fetchone()

            cursor.execute("""
                INSERT IGNORE INTO network (
                    primary_user_id,
                    primary_email,
                    secondary_user_id,
                    secondary_email,
                    role
                )
                VALUES (%s,%s,%s,%s,'admin')
            """, (
                user_id,
                primary["email"],
                admin_user["user_id"],
                admin_user["email"]
            ))
        return {"success": True}

    finally:
        cursor.close()
        db.close()



@app.post("/upload-description")
async def upload_description(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user)
):
    try:

        allowed_extensions = ["txt","pdf","doc","docx","md"]
        ext = file.filename.split(".")[-1].lower()

        if ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail="Invalid file type")

        unique_filename = f"userDescriptions/{user_id}/{uuid.uuid4()}.{ext}"

        s3.upload_fileobj(
            file.file,
            BUCKET_NAME,
            unique_filename,
            ExtraArgs={
                "ContentType": file.content_type
            }
        )

        url = f"https://{BUCKET_NAME}.s3.ap-south-1.amazonaws.com/{unique_filename}"

        return {
            "success": True,
            "url": url
        }

    except Exception as e:
        print("DESCRIPTION UPLOAD ERROR:", e)
        return {"success": False}






@app.get("/me")
def get_me(user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                u.email,
                b.business_name
            FROM users u
            LEFT JOIN profiles p ON p.user_id = u.user_id
            LEFT JOIN businesses b ON b.profile_id = p.profile_id
            WHERE u.user_id = %s
            """,
            (user_id,)
        )

        row = cursor.fetchone()

        return {
            "email": row["email"],
            "business_name": row["business_name"] or "My Business"
        }

    finally:
        cursor.close()
        db.close()


@app.get("/me/business")
def get_my_business(user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        business_id = require_business(user_id, db)

        cursor.execute("""
            SELECT *
            FROM businesses
            WHERE business_id = %s
        """, (business_id,))

        business = cursor.fetchone()

        if not business:
            return {"exists": False}

        excluded_fields = {
            "business_id",
            "profile_id",
            "terms_accepted",
            "privacy_accepted",
            "created_at",
            "updated_at",
            "is_completed"
        }

        clean_business = {
            k: v for k, v in business.items()
            if k not in excluded_fields and v not in (None, "")
        }

        return {
            "exists": True,
            "data": clean_business
        }

    finally:
        cursor.close()
        db.close()




class CreateProductRequest(BaseModel):
    product_id: Optional[int] = None

    product_name: str
    product_description: str

    features: list[str]
    usps: list[str]
    values: list[str]

    images: list[dict]



@app.post("/products")
def create_product(
    req: CreateProductRequest,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)



    try:
        # get business
        cursor.execute("""
            SELECT b.business_id
            FROM businesses b
            JOIN profiles p ON b.profile_id = p.profile_id
            WHERE p.user_id = %s
        """, (user_id,))
        business = cursor.fetchone()

        business_id = require_business(user_id, db)

        if req.product_id:

            product_id = req.product_id

            cursor.execute("""
                UPDATE products
                SET product_name=%s,
                    product_description=%s
                WHERE product_id=%s
                AND business_id=%s
            """, (
                req.product_name,
                req.product_description,
                product_id,
                business_id
            ))

            cursor.execute("DELETE FROM product_features WHERE product_id=%s", (product_id,))
            cursor.execute("DELETE FROM product_usps WHERE product_id=%s", (product_id,))
            cursor.execute("DELETE FROM product_values WHERE product_id=%s", (product_id,))
            cursor.execute("DELETE FROM product_images WHERE product_id=%s", (product_id,))

        else:

            cursor.execute("""
                INSERT INTO products (business_id, product_name, product_description)
                VALUES (%s,%s,%s)
            """, (
                business_id,
                req.product_name,
                req.product_description
            ))

            product_id = cursor.lastrowid

        # features
        for f in req.features:
            if f.strip():
                cursor.execute("""
                    INSERT INTO product_features (product_id, feature_text)
                    VALUES (%s, %s)
                """, (product_id, f))

        # usps
        for u in req.usps:
            if u.strip():
                cursor.execute("""
                    INSERT INTO product_usps (product_id, usp_text)
                    VALUES (%s, %s)
                """, (product_id, u))

        # values
        for v in req.values:
            if v.strip():
                cursor.execute("""
                    INSERT INTO product_values (product_id, value_text)
                    VALUES (%s, %s)
                """, (product_id, v))

        # images
        for img in req.images:
            cursor.execute("""
                INSERT INTO product_images (product_id, img_url, img_caption)
                VALUES (%s, %s, %s)
            """, (
                product_id,
                img["img_url"],
                img.get("img_caption", "")
            ))

        db.commit()

        return {"success": True, "product_id": product_id}

    except IntegrityError:

        # 👇 Duplicate product name
        raise HTTPException(
            status_code=400,
            detail="Product with this name already exists."
        )

    finally:
        cursor.close()
        db.close()


@app.get("/products")
def get_products(user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        business_id = require_business(user_id, db)

        cursor.execute("""
            SELECT product_id, product_name
            FROM products
            WHERE business_id = %s
            ORDER BY created_at DESC
        """, (business_id,))

        products = cursor.fetchall()

        return {"success": True, "data": products}

    finally:
        cursor.close()
        db.close()




@app.get("/products/{product_id}")
def get_product(product_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT *
            FROM products
            WHERE product_id = %s
        """, (product_id,))
        product = cursor.fetchone()

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        cursor.execute("SELECT feature_text FROM product_features WHERE product_id=%s", (product_id,))
        features = [f["feature_text"] for f in cursor.fetchall()]

        cursor.execute("SELECT usp_text FROM product_usps WHERE product_id=%s", (product_id,))
        usps = [u["usp_text"] for u in cursor.fetchall()]

        cursor.execute("SELECT value_text FROM product_values WHERE product_id=%s", (product_id,))
        values = [v["value_text"] for v in cursor.fetchall()]

        cursor.execute("SELECT img_url FROM product_images WHERE product_id=%s", (product_id,))
        images = cursor.fetchall()

        return {
            "success": True,
            "data": {
                "product_name": product["product_name"],
                "product_description": product["product_description"],
                "features": features,
                "usps": usps,
                "values": values,
                "images": images
            }
        }

    finally:
        cursor.close()
        db.close()




@app.get("/media-fields")
def get_media_fields(
    mode: str,
    mediaType: str,
    subType: str,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # 1️⃣ Get media
        cursor.execute(
            "SELECT media_id FROM media WHERE media_name = %s",
            (mode,)
        )
        media = cursor.fetchone()
        if not media:
            return {"success": False}

        # 2️⃣ Get media_type
        cursor.execute(
            """
            SELECT media_type_id
            FROM media_type
            WHERE media_id = %s AND media_type = %s
            """,
            (media["media_id"], mediaType)
        )
        media_type_row = cursor.fetchone()
        if not media_type_row:
            return {"success": False}

        # 3️⃣ Get subtype
        # 3️⃣ Get subtype using media_type_id
        cursor.execute(
            """
            SELECT media_subtype_id
            FROM media_subtype
            WHERE media_type_id = %s
            AND subtype_name = %s
            """,
            (media_type_row["media_type_id"], subType)
        )

        subtype = cursor.fetchone()
        if not subtype:
            return {"success": False}


        # 4️⃣ Fetch default values
        cursor.execute(
            """
            SELECT
            default_value_id AS id,
            label,
            variable_name,
            box
        FROM media_subtype_default_value
        WHERE media_subtype_id = %s
        ORDER BY default_value_id ASC
            """,
            (subtype["media_subtype_id"],)
        )

        rows = cursor.fetchall()

        mandatory = [r for r in rows if r["box"] == "mandatory"]
        optional = [r for r in rows if r["box"] == "optional"]

        return {
            "success": True,
            "data": {
                "mandatory": mandatory,
                "optional": optional
            }
        }

    finally:
        cursor.close()
        db.close()




@app.get("/media-types")
def get_media_types(
    mode: str,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # Get media_id from media table
        cursor.execute(
            "SELECT media_id FROM media WHERE media_name = %s",
            (mode,)
        )
        media = cursor.fetchone()
        if not media:
            return {"success": False, "data": []}

        # Get media types
        cursor.execute(
            """
            SELECT media_type
            FROM media_type
            WHERE media_id = %s
            ORDER BY media_type ASC
            """,
            (media["media_id"],)
        )

        types = cursor.fetchall()

        return {
            "success": True,
            "data": types
        }

    finally:
        cursor.close()
        db.close()






@app.get("/media-subtypes")
def get_media_subtypes(
    mode: str,
    mediaType: str,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # 1️⃣ Get media_id
        cursor.execute(
            "SELECT media_id FROM media WHERE media_name = %s",
            (mode,)
        )
        media = cursor.fetchone()
        if not media:
            return {"success": False}

        # 2️⃣ Get media_type_id
        cursor.execute(
            """
            SELECT media_type_id
            FROM media_type
            WHERE media_id = %s AND media_type = %s
            """,
            (media["media_id"], mediaType)
        )
        media_type_row = cursor.fetchone()
        if not media_type_row:
            return {"success": False}

        # 3️⃣ Get subtypes using media_type_id (THIS IS THE FIX)
        cursor.execute(
            """
            SELECT
                media_subtype_id,
                subtype_name
            FROM media_subtype
            WHERE media_type_id = %s
            ORDER BY media_subtype_id ASC
            """,
            (media_type_row["media_type_id"],)
        )

        rows = cursor.fetchall()

        return {
            "success": True,
            "data": rows
        }

    finally:
        cursor.close()
        db.close()







class CreateDocketRequest(BaseModel):
    title: str
    tab: str
    product_id: Optional[int] = None
    persona_id: Optional[int] = None
    mode: str
    mediaType: str
    subType: str
    planner_date_time: datetime




@app.post("/planner/docket")
def create_docket(
    req: CreateDocketRequest,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # 1️⃣ Get business_id
        cursor.execute("""
            SELECT b.business_id
            FROM businesses b
            JOIN profiles p ON b.profile_id = p.profile_id
            WHERE p.user_id = %s
        """, (user_id,))
        business = cursor.fetchone()

        business_id = require_business(user_id, db)

        if not req.product_id:
            raise HTTPException(
                status_code=400,
                detail="PRODUCT_REQUIRED"
            )

        if not req.persona_id:
            raise HTTPException(
                status_code=400,
                detail="PERSONA_REQUIRED"
            )

        # 2️⃣ Get media_id
        cursor.execute(
            "SELECT media_id FROM media WHERE media_name = %s",
            (req.mode,)
        )
        media = cursor.fetchone()

        if not media:
            return {"success": False}

        media_id = media["media_id"]

        # 3️⃣ Get media_type_id
        cursor.execute("""
            SELECT media_type_id
            FROM media_type
            WHERE media_id = %s AND media_type = %s
        """, (media_id, req.mediaType))

        media_type_row = cursor.fetchone()

        if not media_type_row:
            return {"success": False}

        media_type_id = media_type_row["media_type_id"]

        # 4️⃣ Get media_subtype_id
        cursor.execute("""
            SELECT media_subtype_id
            FROM media_subtype
            WHERE media_type_id = %s AND subtype_name = %s
        """, (media_type_id, req.subType))

        subtype_row = cursor.fetchone()

        if not subtype_row:
            return {"success": False}

        media_subtype_id = subtype_row["media_subtype_id"]

        # 5️⃣ Insert docket
        cursor.execute("""
            INSERT INTO docket (
                title,
                tab,
                business_id,
                product_id,
                persona_id,
                media_id,
                media_type_id,
                media_subtype_id,
                planner_date_time
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            req.title,
            req.tab,
            business_id,
            req.product_id,
            req.persona_id,
            media_id,
            media_type_id,
            media_subtype_id,
            req.planner_date_time
        ))

        docket_id = cursor.lastrowid
        db.commit()

        return {
            "success": True,
            "docket_id": docket_id
        }

    except HTTPException as e:
        raise e   # 🔥 VERY IMPORTANT

    except Exception as e:
        print("🔥 DOCKET SAVE ERROR:", e)
        return {"success": False}

    finally:
        cursor.close()
        db.close()






@app.get("/docket/{docket_id}/business")
def get_docket_business(
    docket_id: int,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # get business_id from docket
        cursor.execute("""
            SELECT business_id
            FROM docket
            WHERE docket_id = %s
        """, (docket_id,))
        
        docket = cursor.fetchone()

        if not docket:
            return {"success": False}

        # get business
        cursor.execute("""
            SELECT *
            FROM businesses
            WHERE business_id = %s
        """, (docket["business_id"],))

        business = cursor.fetchone()

        if not business:
            return {"success": False}

        excluded_fields = {
            "business_id", "profile_id", "terms_accepted",
            "privacy_accepted", "created_at", "updated_at", "is_completed"
        }

        clean_business = {
            k: v for k, v in business.items()
            if k not in excluded_fields and v not in (None, "")
        }

        return {
            "success": True,
            "data": clean_business
        }

    finally:
        cursor.close()
        db.close()



@app.get("/docket/{docket_id}/product")
def get_docket_product(
    docket_id: int,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT product_id
            FROM docket
            WHERE docket_id = %s
        """, (docket_id,))
        
        d = cursor.fetchone()

        if not d or not d["product_id"]:
            return {"success": False}

        product_id = d["product_id"]

        cursor.execute("""
            SELECT *
            FROM products
            WHERE product_id = %s
        """, (product_id,))

        product = cursor.fetchone()

        if not product:
            return {"success": False}

        # same logic as your existing product API
        cursor.execute("SELECT feature_text FROM product_features WHERE product_id=%s", (product_id,))
        features = [f["feature_text"] for f in cursor.fetchall()]

        cursor.execute("SELECT usp_text FROM product_usps WHERE product_id=%s", (product_id,))
        usps = [u["usp_text"] for u in cursor.fetchall()]

        cursor.execute("SELECT value_text FROM product_values WHERE product_id=%s", (product_id,))
        values = [v["value_text"] for v in cursor.fetchall()]

        cursor.execute("SELECT img_url FROM product_images WHERE product_id=%s", (product_id,))
        images = cursor.fetchall()

        return {
            "success": True,
            "data": {
                "product_name": product["product_name"],
                "product_description": product["product_description"],
                "features": features,
                "usps": usps,
                "values": values,
                "images": images
            }
        }

    finally:
        cursor.close()
        db.close()





@app.get("/docket/{docket_id}/persona")
def get_docket_persona(
    docket_id: int,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT persona_id
            FROM docket
            WHERE docket_id = %s
        """, (docket_id,))
        
        d = cursor.fetchone()

        if not d or not d["persona_id"]:
            return {"success": False}

        persona_id = d["persona_id"]

        cursor.execute("""
            SELECT *
            FROM personas
            WHERE persona_id = %s
        """, (persona_id,))
        
        persona = cursor.fetchone()

        cursor.execute("""
            SELECT segment_type, label, value, is_active
            FROM persona_segments
            WHERE persona_id = %s
        """, (persona_id,))
        
        segments = cursor.fetchall()

        persona["segments"] = segments

        return {"success": True, "data": persona}

    finally:
        cursor.close()
        db.close()




@app.get("/execute/{docket_id}/assignment-history")
def get_assignment_history(
    docket_id: int,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT 
                ea.assignment_id,
                ea.stage,
                ea.created_at,

                u1.email AS assigned_by_email,
                u2.email AS assigned_to_email

            FROM execute_assignments ea

            LEFT JOIN users u1 ON ea.assigned_by = u1.user_id
            LEFT JOIN users u2 ON ea.assigned_to = u2.user_id

            WHERE ea.execute_id = %s
            ORDER BY ea.created_at ASC
        """, (docket_id,))

        history = cursor.fetchall()

        return {
            "success": True,
            "data": history
        }

    finally:
        cursor.close()
        db.close()







@app.get("/planner/docket/{docket_id}")
def get_docket(
    docket_id: int,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT 
                d.*,
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
            WHERE d.docket_id = %s
        """, (docket_id,))

        docket = cursor.fetchone()

        if not docket:
            return {"success": False}

        return {
            "success": True,
            "data": docket
        }

    finally:
        cursor.close()
        db.close()






from datetime import date

@app.get("/planner/dockets")
def get_my_dockets(
    selected_date: date,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # 🔍 check if secondary user
        cursor.execute("""
            SELECT primary_user_id
            FROM network
            WHERE secondary_user_id = %s
        """, (user_id,))

        mapping = cursor.fetchone()

        if mapping:
            # 👥 SECONDARY USER → own business + assigned executes

            # 1️⃣ get user's own business
            business_id = require_business(user_id, db)

            cursor.execute("""
                SELECT DISTINCT
                    d.docket_id,
                    d.title,
                    d.tab,
                    d.planner_date_time,
                    m.media_name,
                    mt.media_type,
                    ms.subtype_name,
                    p.product_name,
                    pe.persona_name
                FROM docket d

                LEFT JOIN (
                    SELECT *
                    FROM execute_assignments ea1
                    WHERE ea1.assignment_id = (
                        SELECT ea2.assignment_id
                        FROM execute_assignments ea2
                        WHERE ea2.execute_id = ea1.execute_id
                        ORDER BY ea2.created_at DESC
                        LIMIT 1
                    )
                ) ea ON ea.execute_id = d.docket_id

                LEFT JOIN media m ON d.media_id = m.media_id
                LEFT JOIN media_type mt ON d.media_type_id = mt.media_type_id
                LEFT JOIN media_subtype ms ON d.media_subtype_id = ms.media_subtype_id
                LEFT JOIN products p ON d.product_id = p.product_id
                LEFT JOIN personas pe ON d.persona_id = pe.persona_id

                WHERE (
                    d.business_id = %s      -- ✅ YOUR OWN EXECUTES
                    OR ea.assigned_to = %s  -- ✅ ASSIGNED EXECUTES
                )
                AND DATE(d.planner_date_time) = %s

                ORDER BY d.planner_date_time DESC
            """, (business_id, user_id, selected_date))

        else:
            # 👤 PRIMARY USER → all executes

            business_id = require_business(user_id, db)

            cursor.execute("""
                SELECT
                    d.docket_id,
                    d.title,
                    d.tab,
                    d.planner_date_time,
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
                WHERE d.business_id = %s
                AND DATE(d.planner_date_time) = %s
                ORDER BY d.planner_date_time DESC
            """, (business_id, selected_date))

        rows = cursor.fetchall()

        return {"success": True, "data": rows}

    finally:
        cursor.close()
        db.close()




class AssignExecuteRequest(BaseModel):
    docket_id: int
    user_id: int
    stage: str







from typing import Optional

@app.get("/network/secondary-users")
def get_secondary_users(
    docket_id: Optional[int] = None,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        users = []

        # ✅ 1️⃣ If docket_id → check ownership
        if docket_id:
            cursor.execute("""
                SELECT business_id
                FROM docket
                WHERE docket_id = %s
            """, (docket_id,))
            
            docket = cursor.fetchone()

            if not docket:
                return {"success": True, "data": []}

            user_business_id = require_business(user_id, db)
#################################################################################################
            # 🚨 IF OWN EXECUTE → NO USERS
            if docket["business_id"] == user_business_id:
                return {"success": True, "data": []}
################################################################################################
        # ✅ 2️⃣ PRIMARY USER → get secondary users
        cursor.execute("""
            SELECT secondary_user_id AS user_id, secondary_email AS email
            FROM network
            WHERE primary_user_id = %s
            AND secondary_user_id != %s
        """, (user_id, user_id))

        users = cursor.fetchall()

        # ✅ 3️⃣ SECONDARY USER → get siblings
        if not users:
            cursor.execute("""
                SELECT primary_user_id
                FROM network
                WHERE secondary_user_id = %s
                LIMIT 1
            """, (user_id,))
            mapping = cursor.fetchone()

            if mapping:
                cursor.execute("""
                    SELECT secondary_user_id AS user_id, secondary_email AS email
                    FROM network
                    WHERE primary_user_id = %s
                    AND secondary_user_id != %s
                """, (mapping["primary_user_id"], user_id))

                users = cursor.fetchall()

        return {"success": True, "data": users}

    finally:
        cursor.close()
        db.close()




@app.post("/execute/assign")
def assign_execute(
    req: AssignExecuteRequest,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute("""
            INSERT INTO execute_assignments
            (execute_id, assigned_to, assigned_by, stage)
            VALUES (%s,%s,%s,%s)
        """, (
            req.docket_id,
            req.user_id,
            user_id,
            req.stage
        ))

        db.commit()

        return {"success": True}

    finally:
        cursor.close()
        db.close()




@app.get("/execute/current-stage/{docket_id}")
def get_current_stage(docket_id: int):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT stage
            FROM execute_assignments
            WHERE execute_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (docket_id,))

        row = cursor.fetchone()

        return {
            "success": True,
            "stage": row["stage"] if row else "draft"
        }

    finally:
        cursor.close()
        db.close()










class CreateOccasionRequest(BaseModel):
    title: str
    occasion_date: date
    description: Optional[str] = None
    color: Optional[str] = "#e74c3c"



@app.post("/planner/occasion")
def create_occasion(
    req: CreateOccasionRequest,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # 1️⃣ Get user's business
        cursor.execute("""
            SELECT b.business_id
            FROM businesses b
            JOIN profiles p ON b.profile_id = p.profile_id
            WHERE p.user_id = %s
        """, (user_id,))
        business = cursor.fetchone()

        business_id = require_business(user_id, db)

        # 2️⃣ Insert occasion
        cursor.execute("""
            INSERT INTO occasions (
                business_id,
                created_by,
                title,
                occasion_date,
                description,
                color
            )
            VALUES (%s,%s,%s,%s,%s,%s)
        """, (
            business_id,
            user_id,
            req.title,
            req.occasion_date,
            req.description,
            req.color
        ))

        db.commit()

        return {
            "success": True,
            "occasion_id": cursor.lastrowid
        }

    finally:
        cursor.close()
        db.close()






@app.get("/planner/occasions")
def get_occasions(
    year: int,
    month: int,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # 1️⃣ Get business
        cursor.execute("""
            SELECT b.business_id
            FROM businesses b
            JOIN profiles p ON b.profile_id = p.profile_id
            WHERE p.user_id = %s
        """, (user_id,))
        business = cursor.fetchone()

        if not business:
            return {"success": True, "data": []}

        business_id = business["business_id"]

        # 2️⃣ Calculate month range
        start_date = date(year, month, 1)

        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)

        # 3️⃣ Fetch occasions
        cursor.execute("""
            SELECT occasion_id, title, occasion_date, description, color
            FROM occasions
            WHERE business_id = %s
            AND occasion_date >= %s
            AND occasion_date < %s
            ORDER BY occasion_date ASC
        """, (business_id, start_date, end_date))

        rows = cursor.fetchall()

        return {
            "success": True,
            "data": rows
        }

    finally:
        cursor.close()
        db.close()





class UpdateOccasionRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


@app.put("/planner/occasion/{occasion_id}")
def update_occasion(
    occasion_id: int,
    req: UpdateOccasionRequest,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # verify ownership
        cursor.execute("""
            SELECT o.occasion_id
            FROM occasions o
            JOIN businesses b ON o.business_id = b.business_id
            JOIN profiles p ON b.profile_id = p.profile_id
            WHERE o.occasion_id = %s
            AND p.user_id = %s
        """, (occasion_id, user_id))

        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Unauthorized")

        # dynamic update
        update_fields = []
        values = []

        if req.title:
            update_fields.append("title=%s")
            values.append(req.title)

        if req.description is not None:
            update_fields.append("description=%s")
            values.append(req.description)

        if req.color:
            update_fields.append("color=%s")
            values.append(req.color)

        if not update_fields:
            return {"success": True}

        values.append(occasion_id)

        cursor.execute(f"""
            UPDATE occasions
            SET {", ".join(update_fields)}
            WHERE occasion_id = %s
        """, values)

        db.commit()

        return {"success": True}

    finally:
        cursor.close()
        db.close()



@app.delete("/planner/occasion/{occasion_id}")
def delete_occasion(
    occasion_id: int,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            DELETE o FROM occasions o
            JOIN businesses b ON o.business_id = b.business_id
            JOIN profiles p ON b.profile_id = p.profile_id
            WHERE o.occasion_id = %s
            AND p.user_id = %s
        """, (occasion_id, user_id))

        db.commit()

        return {"success": True}

    finally:
        cursor.close()
        db.close()





@app.get("/planner/docket/{docket_id}/history")
def get_docket_history(
    docket_id: int,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # Verify ownership (important security)
        cursor.execute("""
            SELECT d.docket_id
            FROM docket d
            JOIN businesses b ON d.business_id = b.business_id
            JOIN profiles p ON b.profile_id = p.profile_id
            WHERE d.docket_id = %s
            AND p.user_id = %s
        """, (docket_id, user_id))

        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Unauthorized")

        # Fetch versions
        cursor.execute("""
            SELECT 
                docket_result_id,
                prompt_text,
                created_at
            FROM docket_results
            WHERE docket_id = %s
            ORDER BY created_at DESC
        """, (docket_id,))

        rows = cursor.fetchall()

        return {
            "success": True,
            "data": rows
        }

    finally:
        cursor.close()
        db.close()







from typing import List

class FieldValueItem(BaseModel):
    label: str
    value: str
    checkbox_clicked: int
    box: str
    field_source: str

class SaveFieldValuesRequest(BaseModel):
    fields: List[FieldValueItem]



@app.post("/planner/docket/{docket_id}/fields")
def save_docket_fields(
    docket_id: int,
    req: SaveFieldValuesRequest,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor()

    try:
        for field in req.fields:
            cursor.execute("""
                INSERT INTO media_subtype_field_value
                (docket_id, label, value, checkbox_clicked, box, field_source)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    value = VALUES(value),
                    checkbox_clicked = VALUES(checkbox_clicked),
                    box = VALUES(box)
            """, (
                docket_id,
                field.label,
                field.value,
                field.checkbox_clicked,
                field.box,
                field.field_source
            ))

        db.commit()

        return {"success": True}

    finally:
        cursor.close()
        db.close()





@app.get("/planner/docket/{docket_id}/fields")
def get_docket_fields(
    docket_id: int,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT label, value, checkbox_clicked, box
            FROM media_subtype_field_value
            WHERE docket_id = %s
        """, (docket_id,))

        rows = cursor.fetchall()

        return {
            "success": True,
            "data": rows
        }

    finally:
        cursor.close()
        db.close()



@app.delete("/planner/docket/{docket_id}/field/{label}")
def delete_docket_field(
    docket_id: int,
    label: str,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute("""
            DELETE FROM media_subtype_field_value
            WHERE docket_id = %s
            AND label = %s
            AND field_source = 'custom'
        """, (docket_id, label))

        db.commit()

        return {"success": True}

    finally:
        cursor.close()
        db.close()








@app.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user)
):
    try:
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"userMedia/{user_id}/{uuid.uuid4()}.{file_extension}"

        s3.upload_fileobj(
            file.file,
            BUCKET_NAME,
            unique_filename,
            ExtraArgs={"ContentType": file.content_type}
        )

        image_url = f"https://{BUCKET_NAME}.s3.ap-south-1.amazonaws.com/{unique_filename}"

        return {
            "success": True,
            "url": image_url
        }

    except Exception as e:
        print("UPLOAD ERROR:", e)
        return {"success": False}
    



@app.post("/planner/docket/{docket_id}/media-result")
def save_media_result(
    docket_id: int,
    req: dict,
    user_id: int = Depends(get_current_user)
):

    db = get_db()
    cursor = db.cursor()

    try:

        cursor.execute("""
            INSERT INTO docket_media_results
            (docket_id, submitted_request, visual_text, created_by, status)
            VALUES (%s,%s,%s,%s,0)
        """, (
            docket_id,
            req.get("submitted_request"),   # ✅ NEW
            req.get("visual_text"),
            user_id
        ))

        db.commit()

        return {"success": True}

    except Exception as e:
        print("SAVE MEDIA RESULT ERROR:", e)
        return {"success": False}

    finally:
        cursor.close()
        db.close()




@app.get("/planner/docket/{docket_id}/media-history")
def get_media_history(
    docket_id: int,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute("""
            SELECT docket_media_result_id, visual_text, created_at
            FROM docket_media_results
            WHERE docket_id = %s
            ORDER BY created_at DESC
        """, (docket_id,))

        rows = cursor.fetchall()

        return {
            "success": True,
            "data": rows
        }

    finally:
        cursor.close()
        db.close()






@app.get("/admin/requests")
def get_admin_requests(user_id: int = Depends(get_current_user)):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute("""
            SELECT
                dmr.docket_media_result_id AS id,
                dmr.docket_id,
                u.user_id,
                u.email AS username,
                dmr.submitted_request,
                dmr.created_at AS request_date,
                'Pending' AS status
            FROM docket_media_results dmr
            JOIN users u ON dmr.created_by = u.user_id
            ORDER BY dmr.created_at DESC
        """)

        rows = cursor.fetchall()

        return {
            "success": True,
            "data": rows
        }

    finally:
        cursor.close()
        db.close()



@app.get("/admin/docket/{docket_id}")
def get_admin_docket(docket_id: int):

    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        # 1️⃣ Docket main info
        cursor.execute("""
            SELECT 
                d.*,
                m.media_name,
                mt.media_type,
                ms.subtype_name
            FROM docket d
            LEFT JOIN media m ON d.media_id = m.media_id
            LEFT JOIN media_type mt ON d.media_type_id = mt.media_type_id
            LEFT JOIN media_subtype ms ON d.media_subtype_id = ms.media_subtype_id
            WHERE d.docket_id = %s
        """, (docket_id,))

        docket = cursor.fetchone()

        if not docket:
            return {"success": False}

        # 2️⃣ Product
        product = None
        if docket["product_id"]:
            cursor.execute("""
                SELECT product_id, product_name
                FROM products
                WHERE product_id = %s
            """, (docket["product_id"],))
            product = cursor.fetchone()

        # 3️⃣ Persona
        persona = None
        if docket["persona_id"]:
            cursor.execute("""
                SELECT persona_id, persona_name
                FROM personas
                WHERE persona_id = %s
            """, (docket["persona_id"],))
            persona = cursor.fetchone()

        # 4️⃣ Field values
        cursor.execute("""
            SELECT label, value, box
            FROM media_subtype_field_value
            WHERE docket_id = %s
        """, (docket_id,))

        rows = cursor.fetchall()

        mandatory = [r for r in rows if r["box"] == "mandatory"]
        optional = [r for r in rows if r["box"] == "optional"]

        # 5️⃣ Visual history
        cursor.execute("""
            SELECT 
                dma.admin_media_id,
                dma.uploaded_url,
                dma.message,
                dma.created_at
            FROM docket_media_admin dma
            WHERE dma.docket_id = %s
            ORDER BY dma.created_at DESC
                    """, (docket_id,))

        visual_history = cursor.fetchall()

        # 6️⃣ Chat history
        cursor.execute("""
            SELECT input_json
            FROM chatbot_history
            WHERE docket_id = %s
            ORDER BY created_datetime ASC
        """, (docket_id,))

        chat_rows = cursor.fetchall()

        chat_history = []
        for row in chat_rows:
            data = json.loads(row["input_json"])
            chat_history.append({
                "user": data.get("message")
            })

        return {
            "success": True,
            "data": {
                **docket,
                "product": product,
                "persona": persona,
                "mandatory_fields": mandatory,
                "optional_fields": optional,
                "visual_history": visual_history,
                "chat_history": chat_history
            }
        }

    finally:
        cursor.close()
        db.close()






class UploadVisualRequest(BaseModel):
    uploaded_url: str
    message: str | None = None


@app.post("/admin/docket/{docket_id}/upload-visual")
def upload_visual_result(
    docket_id: int,
    req: UploadVisualRequest,
    user_id: int = Depends(get_current_user)
):

    db = get_db()
    cursor = db.cursor()

    try:

        uploaded_by = None if user_id == 0 else user_id

        cursor.execute("""
        INSERT INTO docket_media_admin
        (
            docket_id,
            uploaded_url,
            message
        )
        VALUES (%s,%s,%s)
        """, (
            docket_id,
            req.uploaded_url,
            req.message
        ))

        db.commit()

        return {"success": True}

    except Exception as e:
        print("ADMIN UPLOAD ERROR:", e)
        db.rollback()
        return {"success": False}

    finally:
        cursor.close()
        db.close()





@app.get("/planner/docket/{docket_id}/visual")
def get_visual_result(
    docket_id: int,
    user_id: int = Depends(get_current_user)
):

    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute("""
            SELECT admin_media_id, uploaded_url, message
            FROM docket_media_admin
            WHERE docket_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (docket_id,))

        row = cursor.fetchone()

        return {
            "success": True,
            "admin_media_id": row["admin_media_id"] if row else None,
            "url": row["uploaded_url"] if row else None,
            "message": row["message"] if row else None
        }

    finally:
        cursor.close()
        db.close()










class UpdateVisualMessageRequest(BaseModel):
    message: str


@app.post("/admin/docket/{docket_id}/message")
def update_visual_message(
    docket_id: int,
    req: UpdateVisualMessageRequest,
    user_id: int = Depends(get_current_user)
):

    db = get_db()
    cursor = db.cursor()

    try:

        cursor.execute("""
            UPDATE docket_media_admin
            SET message = %s
            WHERE docket_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (
            req.message,
            docket_id
        ))

        db.commit()

        return {"success": True}

    finally:
        cursor.close()
        db.close()





class FeedbackRequest(BaseModel):
    docket_id: int
    admin_media_id: int
    feedback: str




@app.post("/feedback")
def add_feedback(
    req: FeedbackRequest,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)  # 🔥 FIX HERE

    try:

        cursor.execute(
            "SELECT email FROM users WHERE user_id=%s",
            (user_id,)
        )
        user = cursor.fetchone()

        role = "admin" if user and user["email"] == os.getenv("ADMIN_EMAIL") else "user"

        cursor.execute("""
            INSERT INTO feedback_history
            (docket_id, admin_media_id, user_id, feedback, role)
            VALUES (%s,%s,%s,%s,%s)
        """, (
            req.docket_id,
            req.admin_media_id,
            user_id,
            req.feedback,
            role
        ))

        db.commit()

        return {"success": True}

    except Exception as e:
        print("FEEDBACK ERROR:", e)
        return {"success": False}

    finally:
        cursor.close()
        db.close()




@app.get("/feedback/{admin_media_id}")
def get_feedback(
    admin_media_id: int,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute("""
            SELECT 
                f.feedback_history_id,
                f.feedback,
                f.role,
                f.created_at,
                u.email
            FROM feedback_history f
            JOIN users u ON f.user_id = u.user_id
            WHERE f.admin_media_id = %s
            ORDER BY f.created_at ASC
        """, (admin_media_id,))

        rows = cursor.fetchall()

        return {
            "success": True,
            "data": rows
        }

    finally:
        cursor.close()
        db.close()



@app.get("/feedback/docket/{docket_id}")
def get_docket_feedback(
    docket_id: int,
    user_id: int = Depends(get_current_user)
):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute("""
            SELECT 
                f.feedback_history_id,
                f.feedback,
                f.role,
                f.created_at,
                f.admin_media_id,
                u.email,
                dma.uploaded_url AS image_url   -- 🔥 THIS LINE ADDED
            FROM feedback_history f
            JOIN users u ON f.user_id = u.user_id
            LEFT JOIN docket_media_admin dma   -- 🔥 JOIN ADDED
                ON f.admin_media_id = dma.admin_media_id
            WHERE f.docket_id = %s
            ORDER BY f.created_at ASC
        """, (docket_id,))

        rows = cursor.fetchall()

        return {
            "success": True,
            "data": rows
        }

    finally:
        cursor.close()
        db.close()








        




import os

@app.post("/admin/login")
def admin_login(req: LoginRequest):

    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

    if req.email != ADMIN_EMAIL or req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # get admin user from users table
        cursor.execute(
            "SELECT user_id FROM users WHERE email=%s",
            (ADMIN_EMAIL,)
        )
        admin = cursor.fetchone()

        if not admin:
            raise HTTPException(status_code=500, detail="Admin user missing in DB")

        admin_user_id = admin["user_id"]

        token = create_token(admin_user_id)
        expires_at = datetime.utcnow() + timedelta(hours=24)

        cursor.execute("""
            INSERT INTO auth_tokens (user_id, jwt_token, expires_at)
            VALUES (%s,%s,%s)
        """, (
            admin_user_id,
            token,
            expires_at
        ))

        db.commit()

        return {
            "access_token": token
        }

    finally:
        cursor.close()
        db.close()





#################stages########################
@app.get("/process-stages/{current_stage}")
def get_next_stages(current_stage: str):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT next_stage
            FROM process_stage
            WHERE current_stage = %s
        """, (current_stage,))

        rows = cursor.fetchall()

        return {
            "success": True,
            "data": [r["next_stage"] for r in rows]
        }

    finally:
        cursor.close()
        db.close()