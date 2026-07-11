"""
Mifrufely Web — Async Email Service (Gmail SMTP)
Uses standard smtplib executed in a thread pool executor to remain fully asynchronous.
Includes premium HTML email template with Outfit/Inter typography and warm pastel aesthetics.
"""

import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


class EmailService:
    """
    Asynchronous Email Service for Mytrufely Web.
    Leverages thread pool execution for non-blocking SMTP operations.
    """

    @staticmethod
    async def send_verification_email(to_email: str, token: str, user_name: str) -> None:
        """
        Sends an account verification email to the user.
        Runs smtp operation inside an executor to keep FastAPI event loop responsive.
        """
        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(
                None,
                EmailService._send_smtp_verification,
                to_email,
                token,
                user_name,
            )
            logger.info("email.sent_success", recipient=to_email, template="verification")
        except Exception as exc:
            logger.error("email.sent_failed", recipient=to_email, error=str(exc))
            # We fail silently at API level to prevent blocking the registration transaction,
            # but log the incident with high priority.

    @staticmethod
    async def send_password_reset_email(to_email: str, token: str, user_name: str) -> None:
        """
        Sends a password reset email to the user.
        Runs smtp operation inside an executor to keep FastAPI event loop responsive.
        """
        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(
                None,
                EmailService._send_smtp_password_reset,
                to_email,
                token,
                user_name,
            )
            logger.info("email.sent_success", recipient=to_email, template="password_reset")
        except Exception as exc:
            logger.error("email.sent_failed", recipient=to_email, error=str(exc))
            # Fail silently at API level to avoid leaking SMTP errors and to preserve
            # the anti-enumeration guarantee of the forgot-password endpoint.

    @staticmethod
    def _send_smtp_password_reset(to_email: str, token: str, user_name: str) -> None:
        # SMTP configuration validation
        smtp_password = settings.SMTP_PASSWORD.get_secret_value()
        if not settings.SMTP_USER or not smtp_password:
            logger.warning("email.smtp_not_configured", detail="SMTP credentials are empty. Email was skipped.")
            return

        # Build email structure
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "🔐 Restablece tu contraseña en Mitrufely Web"
        msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
        msg["To"] = to_email

        # Build reset URL pointing to the Frontend React application
        frontend_url = settings.FRONTEND_URL
        reset_link = f"{frontend_url}/reset-password?token={token}"

        # Log reset link to standard out for easy local copy-paste development
        logger.info("email.password_reset_link_generated", link=reset_link)

        # Expiry text — derived from the configured token validity
        expiry_minutes = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES

        # Premium Responsive HTML Email Template (Harmonized Pastry Theme)
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Restablece tu Contraseña</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Playfair+Display:ital,wght@1,600&display=swap');

                body {{
                    margin: 0;
                    padding: 0;
                    width: 100% !important;
                    background-color: #fcf8f2;
                    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    -webkit-font-smoothing: antialiased;
                }}

                .wrapper {{
                    width: 100%;
                    table-layout: fixed;
                    background-color: #fcf8f2;
                    padding: 40px 0;
                }}

                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 16px;
                    border: 1px solid #e9d5ca;
                    box-shadow: 0 8px 30px rgba(60, 47, 47, 0.04);
                    overflow: hidden;
                }}

                .header {{
                    background: linear-gradient(135deg, #d885a3, #fdcfdf);
                    padding: 40px 20px;
                    text-align: center;
                    color: #ffffff;
                }}

                .header h1 {{
                    margin: 0;
                    font-family: 'Playfair Display', Georgia, serif;
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 0.5px;
                    text-shadow: 0 2px 4px rgba(216, 133, 163, 0.15);
                }}

                .header p {{
                    margin: 10px 0 0 0;
                    font-size: 16px;
                    opacity: 0.95;
                    font-weight: 400;
                }}

                .content {{
                    padding: 40px 35px;
                    color: #3c2f2f;
                    line-height: 1.65;
                }}

                .content h2 {{
                    margin-top: 0;
                    font-size: 22px;
                    color: #d885a3;
                    font-weight: 600;
                }}

                .content p {{
                    font-size: 15px;
                    margin: 0 0 20px 0;
                }}

                .btn-container {{
                    text-align: center;
                    margin: 35px 0;
                }}

                .btn {{
                    background-color: #d885a3;
                    color: #ffffff !important;
                    padding: 15px 35px;
                    text-decoration: none;
                    font-size: 16px;
                    font-weight: 600;
                    border-radius: 10px;
                    display: inline-block;
                    box-shadow: 0 6px 16px rgba(216, 133, 163, 0.25);
                    transition: all 0.2s ease-in-out;
                }}

                .footer {{
                    background-color: #fdfaf6;
                    padding: 25px 35px;
                    text-align: center;
                    font-size: 12px;
                    color: #8c7e7e;
                    border-top: 1px solid #f3e9e3;
                }}

                .footer p {{
                    margin: 0 0 5px 0;
                }}

                .footer a {{
                    color: #d885a3;
                    text-decoration: none;
                }}

                .link-fallback {{
                    word-break: break-all;
                    font-size: 12px;
                    color: #8c7e7e;
                    background-color: #fdfaf6;
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px dashed #e9d5ca;
                    margin-top: 25px;
                }}

                .warning-box {{
                    background-color: #fff5f5;
                    border: 1px solid #f3d0d0;
                    border-radius: 8px;
                    padding: 15px;
                    margin-top: 20px;
                    font-size: 13px;
                    color: #8c4a4a;
                }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header">
                        <h1>Mitrufely Web</h1>
                        <p>Pastelería Artesanal & Experiencias Dulces</p>
                    </div>

                    <div class="content">
                        <h2>Hola, {user_name} 👋</h2>
                        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Mitrufely Web</strong>.</p>
                        <p>Para elegir una nueva contraseña y volver a acceder a tu cuenta, haz clic en el siguiente botón:</p>

                        <div class="btn-container">
                            <a href="{reset_link}" class="btn" target="_blank">Restablecer Mi Contraseña</a>
                        </div>

                        <p>Este enlace es válido por <strong>{expiry_minutes} minutos</strong> y puede usarse una sola vez. Si no solicitaste este cambio, puedes ignorar este correo con total tranquilidad: tu contraseña actual no ha sido modificada.</p>

                        <div class="warning-box">
                            🔒 <strong>Consejo de seguridad:</strong> Nunca compartas este enlace con nadie. El equipo de Mitrufely Web nunca te pedirá tu contraseña.
                        </div>

                        <div class="link-fallback">
                            <strong>¿El botón no funciona?</strong> Copia y pega esta dirección en tu navegador:<br>
                            <a href="{reset_link}" style="color: #d885a3; text-decoration: underline;">{reset_link}</a>
                        </div>
                    </div>

                    <div class="footer">
                        <p>Este es un correo generado automáticamente de forma segura por Mitrufely Web.</p>
                        <p>© 2026 Mitrufely Web. Todos los derechos reservados.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        msg.attach(MIMEText(html_content, "html"))

        # Send via SMTP
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()  # Start secure TLS connection
            server.login(settings.SMTP_USER, smtp_password)
            server.sendmail(settings.SMTP_FROM or settings.SMTP_USER, to_email, msg.as_string())

        # Premium Responsive HTML Email Template (Harmonized Pastry Theme)
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verifica tu Cuenta</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Playfair+Display:ital,wght@1,600&display=swap');
                
                body {{
                    margin: 0;
                    padding: 0;
                    width: 100% !important;
                    background-color: #fcf8f2;
                    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    -webkit-font-smoothing: antialiased;
                }}
                
                .wrapper {{
                    width: 100%;
                    table-layout: fixed;
                    background-color: #fcf8f2;
                    padding: 40px 0;
                }}
                
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 16px;
                    border: 1px solid #e9d5ca;
                    box-shadow: 0 8px 30px rgba(60, 47, 47, 0.04);
                    overflow: hidden;
                }}
                
                .header {{
                    background: linear-gradient(135deg, #d885a3, #fdcfdf);
                    padding: 40px 20px;
                    text-align: center;
                    color: #ffffff;
                }}
                
                .header h1 {{
                    margin: 0;
                    font-family: 'Playfair Display', Georgia, serif;
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 0.5px;
                    text-shadow: 0 2px 4px rgba(216, 133, 163, 0.15);
                }}
                
                .header p {{
                    margin: 10px 0 0 0;
                    font-size: 16px;
                    opacity: 0.95;
                    font-weight: 400;
                }}
                
                .content {{
                    padding: 40px 35px;
                    color: #3c2f2f;
                    line-height: 1.65;
                }}
                
                .content h2 {{
                    margin-top: 0;
                    font-size: 22px;
                    color: #d885a3;
                    font-weight: 600;
                }}
                
                .content p {{
                    font-size: 15px;
                    margin: 0 0 20px 0;
                }}
                
                .btn-container {{
                    text-align: center;
                    margin: 35px 0;
                }}
                
                .btn {{
                    background-color: #d885a3;
                    color: #ffffff !important;
                    padding: 15px 35px;
                    text-decoration: none;
                    font-size: 16px;
                    font-weight: 600;
                    border-radius: 10px;
                    display: inline-block;
                    box-shadow: 0 6px 16px rgba(216, 133, 163, 0.25);
                    transition: all 0.2s ease-in-out;
                }}
                
                .footer {{
                    background-color: #fdfaf6;
                    padding: 25px 35px;
                    text-align: center;
                    font-size: 12px;
                    color: #8c7e7e;
                    border-top: 1px solid #f3e9e3;
                }}
                
                .footer p {{
                    margin: 0 0 5px 0;
                }}
                
                .footer a {{
                    color: #d885a3;
                    text-decoration: none;
                }}
                
                .link-fallback {{
                    word-break: break-all;
                    font-size: 12px;
                    color: #8c7e7e;
                    background-color: #fdfaf6;
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px dashed #e9d5ca;
                    margin-top: 25px;
                }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header">
                        <h1>Mitrufely Web</h1>
                        <p>Pastelería Artesanal & Experiencias Dulces</p>
                    </div>
                    
                    <div class="content">
                        <h2>¡Hola, {user_name}! 👋</h2>
                        <p>¡Qué alegría tenerte con nosotros! Te has registrado con éxito en la plataforma de <strong>Mitrufely Web</strong>.</p>
                        <p>Para poder activar tu cuenta, verificar tu identidad de forma segura y comenzar a realizar pedidos deliciosos y acumular <strong>SweetCoins</strong>, haz clic en el siguiente botón:</p>
                        
                        <div class="btn-container">
                            <a href="{verification_link}" class="btn" target="_blank">Confirmar Mi Cuenta</a>
                        </div>
                        
                        <p>Este enlace es válido por 24 horas. Si no solicitaste este registro, puedes ignorar este correo con total tranquilidad.</p>
                        
                        <div class="link-fallback">
                            <strong>¿El botón no funciona?</strong> Copia y pega esta dirección en tu navegador:<br>
                            <a href="{verification_link}" style="color: #d885a3; text-decoration: underline;">{verification_link}</a>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Este es un correo generado automáticamente de forma segura por Mitrufely Web.</p>
                        <p>© 2026 Mitrufely Web. Todos los derechos reservados.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        msg.attach(MIMEText(html_content, "html"))

        # Send via SMTP
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()  # Start secure TLS connection
            server.login(settings.SMTP_USER, smtp_password)
            server.sendmail(settings.SMTP_FROM or settings.SMTP_USER, to_email, msg.as_string())
