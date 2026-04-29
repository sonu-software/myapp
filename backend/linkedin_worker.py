from database import get_db
from linkedin_service import post_to_linkedin, get_business_linkedin
from datetime import datetime


def process_pending_posts():
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT * FROM linkedin_posts
        WHERE status='pending'
        ORDER BY created_at ASC
        LIMIT 10
    """)
  
    posts = cursor.fetchall()

    for post in posts:
        try:
            account = get_business_linkedin(post["business_id"])

            if not account:
                raise Exception("LinkedIn not connected")

            # ✅ ADD THIS BLOCK
            if account["expires_at"] and account["expires_at"] < datetime.utcnow():
                raise Exception("LinkedIn token expired")

            urn = post_to_linkedin(
                account["access_token"],
                account["linkedin_urn"],
                post["content"]
            )

            cursor.execute("""
                UPDATE linkedin_posts
                SET status='posted',
                    linkedin_post_urn=%s,
                    posted_at=NOW(),
                    last_attempt_at=NOW()
                WHERE id=%s
            """, (urn, post["id"]))

            db.commit()

        except Exception as e:
            cursor.execute("""
                UPDATE linkedin_posts
                SET 
                    status = CASE 
                        WHEN retry_count + 1 >= 3 THEN 'failed'
                        ELSE 'pending'
                    END,
                    retry_count = retry_count + 1,
                    last_attempt_at = NOW(),
                    error_message = %s
                WHERE id=%s
            """, (str(e), post["id"]))

            db.commit()

    cursor.close()
    db.close()