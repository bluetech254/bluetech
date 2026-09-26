"""
notifications/email.py — Email sending via AWS SES.

Single public function: send_verification_email(recipient, code) -> bool
Falls back gracefully if AWS credentials are not configured — signup
still works without email, just the verification email won't send.
"""
import logging
from core.config import settings

logger = logging.getLogger(__name__)


def send_verification_email(recipient_email: str, code: str) -> bool:
    """
    Send an email verification code via AWS SES.

    Returns True on success, False on any failure (never raises).
    If AWS credentials are not configured, logs a warning and returns False.
    """
    if not all([settings.AWS_ACCESS_KEY_ID, settings.AWS_SECRET_ACCESS_KEY, settings.SES_SENDER_EMAIL]):
        logger.warning("Email skipped: AWS SES credentials not fully configured")
        return False

    try:
        import boto3
        from botocore.exceptions import ClientError

        ses = boto3.client(
            "ses",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

        html_body = f"""
        <html><body style="font-family: sans-serif; color: #333;">
          <h2>Welcome to Blue Technology!</h2>
          <p>Your email verification code is:</p>
          <h1 style="color: #2563eb; font-size: 36px; letter-spacing: 6px;">{code}</h1>
          <p>Enter this code in the app to verify your email address.</p>
          <p style="color: #888; font-size: 12px;">
            This code expires in 24 hours. If you did not request this, ignore this email.
          </p>
        </body></html>
        """

        text_body = (
            f"Welcome to Blue Technology!\n\n"
            f"Your email verification code is: {code}\n\n"
            f"This code expires in 24 hours.\n"
            f"If you did not request this, ignore this email."
        )

        ses.send_email(
            Source=settings.SES_SENDER_EMAIL,
            Destination={"ToAddresses": [recipient_email]},
            Message={
                "Subject": {"Data": "Blue Technology — Email Verification"},
                "Body": {
                    "Text": {"Data": text_body},
                    "Html": {"Data": html_body},
                },
            },
        )
        logger.info(f"Verification email sent to {recipient_email}")
        return True

    except Exception as e:
        logger.warning(f"Email to {recipient_email} failed: {e}")
        return False


def send_password_reset_email(recipient_email: str, code: str) -> bool:
    """
    Send a password reset code via AWS SES.
    Returns True on success, False on any failure (never raises).
    """
    if not all([settings.AWS_ACCESS_KEY_ID, settings.AWS_SECRET_ACCESS_KEY, settings.SES_SENDER_EMAIL]):
        logger.warning("Email skipped: AWS SES credentials not fully configured")
        return False

    try:
        import boto3

        ses = boto3.client(
            "ses",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

        html_body = f"""
        <html><body style="font-family: sans-serif; color: #333;">
          <h2>Blue Technology Password Reset</h2>
          <p>Your password reset code is:</p>
          <h1 style="color: #dc2626; font-size: 36px; letter-spacing: 6px;">{code}</h1>
          <p>This code expires in 1 hour.</p>
          <p style="color: #888; font-size: 12px;">
            If you did not request a password reset, ignore this email.
          </p>
        </body></html>
        """

        ses.send_email(
            Source=settings.SES_SENDER_EMAIL,
            Destination={"ToAddresses": [recipient_email]},
            Message={
                "Subject": {"Data": "Blue Technology — Password Reset"},
                "Body": {
                    "Text": {"Data": f"Your BlueTech password reset code: {code}\nExpires in 1 hour."},
                    "Html": {"Data": html_body},
                },
            },
        )
        logger.info(f"Password reset email sent to {recipient_email}")
        return True

    except Exception as e:
        logger.warning(f"Password reset email to {recipient_email} failed: {e}")
        return False
