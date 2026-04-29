import smtplib
import os
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from datetime import datetime, timedelta


def generate_otp():
    return str(random.randint(100000, 999999))


def send_otp_email(to_email, otp):
    SMTP_SERVER = os.getenv("SMTP_SERVER")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_EMAIL = os.getenv("SMTP_EMAIL")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

    subject = "Your OTP Code"
    
    html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Code</title>
        </head>

        <body style="margin:0; padding:0; background-color:#f4f6f8; font-family: 'Segoe UI', Arial, sans-serif;">

        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding: 30px 0;">
        <tr>
        <td align="center">

            <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                
                <!-- Header -->
                <tr>
                    <td style="background: linear-gradient(135deg, #4A90E2, #357ABD); padding: 20px; text-align:center;">
                        <h1 style="color:#ffffff; margin:0; font-size:22px; letter-spacing:0.5px;">
                            ELEVANTIA PACE
                        </h1>
                    </td>
                </tr>

                <!-- Body -->
                <tr>
                    <td style="padding: 30px; color:#333;">
                        
                        <p style="font-size:16px; margin-bottom:10px;">
                            Secure Verification
                        </p>

                        <p style="font-size:15px; color:#555; line-height:1.6;">
                            We received a request related to your account. Please use the verification code below to proceed.
                        </p>

                        <!-- OTP Box -->
                        <div style="text-align:center; margin: 30px 0;">
                            <span style="
                                display:inline-block;
                                background:#f0f4ff;
                                color:#2c3e50;
                                font-size:28px;
                                letter-spacing:6px;
                                font-weight:bold;
                                padding:15px 25px;
                                border-radius:8px;
                                border:1px solid #dce3f0;
                            ">
                                {otp}
                            </span>
                        </div>

                        <p style="font-size:14px; color:#666; text-align:center;">
                            This code will expire <strong>Soon.</strong>.
                        </p>

                        <hr style="border:none; border-top:1px solid #eee; margin:25px 0;">

                        <p style="font-size:13px; color:#999; line-height:1.5;">
                            If you did not request this, you can safely ignore this email. Your account remains secure.
                        </p>

                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="background:#fafafa; padding:15px; text-align:center; font-size:12px; color:#aaa;">
                        © ELEVANTIA PACE. All rights reserved.
                    </td>
                </tr>

            </table>

        </td>
        </tr>
        </table>

        </body>
        </html>
        """

    msg = MIMEMultipart()
    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject

    msg.attach(MIMEText(html_content, "html"))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        print("SMTP ERROR:", e)
        raise Exception("Failed to send email")