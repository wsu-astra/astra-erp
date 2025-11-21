"""
Email notification service for inventory alerts
Supports both mock mode (console) and real emails (Gmail SMTP)
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    def __init__(self):
        self.gmail_user = os.getenv("GMAIL_USER")
        self.gmail_password = os.getenv("GMAIL_APP_PASSWORD")
        self.mock_mode = not (self.gmail_user and self.gmail_password)
        
        print("\n" + "="*60)
        if self.mock_mode:
            print("📧 EMAIL SERVICE: MOCK MODE (Console Only)")
            print("No Gmail credentials found in environment")
            print("Emails will be printed to console instead")
        else:
            print("📧 EMAIL SERVICE: LIVE MODE (Gmail SMTP)")
            print(f"Gmail account: {self.gmail_user}")
            print("Emails will be sent via Gmail")
        print("="*60 + "\n")
    
    def send_low_stock_alert(
        self, 
        to_email: str, 
        business_name: str, 
        low_stock_items: List[Dict]
    ) -> bool:
        """Send low stock alert email"""
        
        if self.mock_mode:
            return self._send_mock_email(to_email, business_name, low_stock_items)
        else:
            return self._send_gmail_email(to_email, business_name, low_stock_items)
    
    def _send_mock_email(self, to_email: str, business_name: str, items: List[Dict]) -> bool:
        """Mock email - prints to console (perfect for hackathon demo)"""
        print("\n" + "="*60)
        print("📧 MOCK EMAIL SENT")
        print("="*60)
        print(f"To: {to_email}")
        print(f"Subject: 🚨 Low Stock Alert - {business_name}")
        print("\nItems needing attention:")
        for item in items:
            print(f"  • {item['name']}: {item['current_quantity']} {item['unit']} " +
                  f"(needs {item['minimum_quantity']})")
        print("="*60 + "\n")
        return True
    
    def _send_gmail_email(self, to_email: str, business_name: str, items: List[Dict]) -> bool:
        """Send real email via Gmail SMTP"""
        try:
            print(f"📧 Attempting to send email to: {to_email}")
            print(f"📧 Using Gmail account: {self.gmail_user}")
            
            # Build HTML email
            items_html = "".join([
                f"<li><strong>{item['name']}</strong>: "
                f"{item['current_quantity']} {item['unit']} "
                f"(minimum: {item['minimum_quantity']})</li>"
                for item in items
            ])
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif;">
                <h2 style="color: #DC2626;">🚨 Low Stock Alert</h2>
                <p>Hi {business_name} team,</p>
                <p>The following items are running low and need to be reordered:</p>
                <ul style="color: #374151;">
                    {items_html}
                </ul>
                <p>Please review your inventory and place orders as needed.</p>
                <hr style="margin: 20px 0;">
                <p style="color: #6B7280; font-size: 12px;">
                    Sent by MainStreet Copilot - Your Business Operating System
                </p>
            </body>
            </html>
            """
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = f"🚨 Low Stock Alert - {business_name}"
            message["From"] = self.gmail_user
            message["To"] = to_email
            
            # Attach HTML content
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
            
            print(f"📧 Connecting to Gmail SMTP...")
            
            # Send via Gmail SMTP
            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(self.gmail_user, self.gmail_password)
                server.send_message(message)
            
            print(f"✅ Email sent successfully!")
            print(f"✅ To: {to_email}")
            print(f"✅ From: {self.gmail_user}")
            return True
            
        except Exception as e:
            print(f"❌ Email sending failed!")
            print(f"❌ Error type: {type(e).__name__}")
            print(f"❌ Error message: {str(e)}")
            import traceback
            print(f"❌ Full traceback:")
            traceback.print_exc()
            return False

# Singleton instance
email_service = EmailService()