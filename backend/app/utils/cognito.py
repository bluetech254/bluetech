import boto3
from botocore.exceptions import ClientError
from app.config import settings
from typing import Optional

class CognitoService:
    def __init__(self):
        self.client = boto3.client(
            'cognito-idp',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        self.user_pool_id = settings.COGNITO_USER_POOL_ID
        self.app_client_id = settings.COGNITO_APP_CLIENT_ID
    
    def send_verification_email(self, email: str, verification_code: str) -> bool:
        """
        For now, we'll store the code in our database and return it in the response
        In production, integrate with a proper email service (SendGrid, Mailgun, etc.)
        or configure Cognito custom email templates
        """
        # Cognito's AdminCreateUser doesn't support custom OTP emails nicely
        # We'll handle email sending through a dedicated email service later
        # For MVP, the verification code is returned in the API response
        
        print(f"ℹ️ Verification code for {email}: {verification_code}")
        print(f"   (Email sending will be configured with custom email service)")
        return True
    
    def verify_email_code(self, email: str, code: str) -> bool:
        """Verify email with code"""
        try:
            # Get user's verification code from our database
            # (Cognito doesn't store our custom verification codes)
            response = self.client.admin_get_user(
                UserPoolId=self.user_pool_id,
                Username=email
            )
            
            # Code verification happens in our auth_service.py
            # This just marks email as verified in Cognito after successful verification
            self.client.admin_update_user_attributes(
                UserPoolId=self.user_pool_id,
                Username=email,
                UserAttributes=[
                    {'Name': 'email_verified', 'Value': 'true'}
                ]
            )
            
            print(f"✅ Email verified in Cognito: {email}")
            return True
            
        except ClientError as e:
            print(f"❌ Cognito verification error: {e.response['Error']['Code']}")
            return False
    
    def send_password_reset_email(self, email: str, reset_code: str) -> bool:
        """Send password reset email"""
        try:
            # Update user with reset code
            self.client.admin_update_user_attributes(
                UserPoolId=self.user_pool_id,
                Username=email,
                UserAttributes=[
                    {'Name': 'custom:reset_code', 'Value': reset_code}
                ]
            )
            
            # In production, trigger SES email here
            return True
            
        except ClientError:
            return False

# Initialize service
cognito_service = CognitoService()
