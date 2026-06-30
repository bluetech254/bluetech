import boto3
from botocore.exceptions import ClientError
from app.config import settings

class EmailService:
    """Simple email service for sending OTP codes"""
    
    def __init__(self):
        self.ses_client = boto3.client(
            'ses',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        self.sender_email = "dallaherick0@gmail.com"  # Verified sender
    
    def send_verification_code(self, recipient_email: str, code: str) -> bool:
        """Send verification code email"""
        try:
            subject = "Blue Technology - Email Verification Code"
            
            html_body = f"""
            <html>
            <head></head>
            <body>
                <h2>Welcome to Blue Technology!</h2>
                <p>Your email verification code is:</p>
                <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px;">{code}</h1>
                <p>Enter this code in the app to verify your email address.</p>
                <p>This code will expire in 24 hours.</p>
                <br>
                <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
            </body>
            </html>
            """
            
            text_body = f"""
            Welcome to Blue Technology!
            
            Your email verification code is: {code}
            
            Enter this code in the app to verify your email address.
            This code will expire in 24 hours.
            
            If you didn't request this code, please ignore this email.
            """
            
            response = self.ses_client.send_email(
                Source=self.sender_email,
                Destination={'ToAddresses': [recipient_email]},
                Message={
                    'Subject': {'Data': subject},
                    'Body': {
                        'Text': {'Data': text_body},
                        'Html': {'Data': html_body}
                    }
                }
            )
            
            print(f"✅ Verification email sent to {recipient_email}")
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            print(f"⚠️  Email send failed: {error_code}")
            # Don't fail signup if email fails - code is in API response
            return False

# Initialize service
email_service = EmailService()
