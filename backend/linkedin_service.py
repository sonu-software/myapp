import requests
from database import get_db

LINKEDIN_API_URL = "https://api.linkedin.com/v2/ugcPosts"


def get_business_linkedin(business_id):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT * FROM linkedin_accounts
        WHERE business_id=%s AND is_active=1
        LIMIT 1
    """, (business_id,))

    acc = cursor.fetchone()

    cursor.close()
    db.close()

    return acc


def create_post_entry(business_id, user_id, docket_id, content):
    db = get_db()
    cursor = db.cursor()

    cursor.execute("""
        INSERT INTO linkedin_posts (business_id, user_id, docket_id, content)
        VALUES (%s, %s, %s, %s)
    """, (business_id, user_id, docket_id, content))

    db.commit()
    post_id = cursor.lastrowid

    cursor.close()
    db.close()

    return post_id


def post_to_linkedin(access_token, author_urn, text):
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
    }

    payload = {
        "author": author_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "NONE"
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
    }

    res = requests.post(LINKEDIN_API_URL, headers=headers, json=payload)

    if res.status_code != 201:
        raise Exception(res.text)

    return res.headers.get("x-restli-id")