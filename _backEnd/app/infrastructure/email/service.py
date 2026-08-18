"""
Mifrufely Web — Async Email Service (Gmail SMTP)
Uses standard smtplib executed in a thread pool executor to remain fully asynchronous.
Includes premium HTML email template with Outfit/Inter typography and warm pastel aesthetics.
"""

import asyncio
import os
import smtplib
from datetime import datetime
from decimal import Decimal
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional

import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

# Referencia fuerte a tareas asíncronas en background para evitar que el Garbage Collector las destruya prematuramente
_background_email_tasks: set[asyncio.Task] = set()


class EmailService:
    """
    Asynchronous Email Service for Mytrufely Web.
    Leverages thread pool execution for non-blocking SMTP operations.
    """

    @staticmethod
    def fire_and_forget_order_status_email(*args, **kwargs) -> None:
        """
        Schedules send_order_status_email.
        Production: enqueues via Cloud Tasks for guaranteed delivery.
        Development: uses asyncio.create_task (fire-and-forget).
        """
        if settings.is_production and settings.GCP_PROJECT_ID:
            from app.infrastructure.cloud_tasks.client import enqueue_task
            # Build serializable payload from args/kwargs
            payload = {
                "template": "order_status",
                "to_email": kwargs.get("to_email", args[0] if args else ""),
                "data": {k: str(v) if v is not None else None for k, v in kwargs.items() if k != "to_email"},
            }
            enqueue_task("/api/v1/tasks/send-email", payload)
        else:
            task = asyncio.create_task(EmailService.send_order_status_email(*args, **kwargs))
            _background_email_tasks.add(task)
            task.add_done_callback(_background_email_tasks.discard)

    @staticmethod
    async def send_order_status_email(
        to_email: str,
        user_name: str,
        id_venta: int,
        tipo: str,
        titulo: str,
        mensaje: str,
        total_final: Optional[Decimal] = None,
        eta: Optional[datetime] = None,
        motivo: Optional[str] = None,
    ) -> None:
        """
        Sends an order status update email to the user asynchronously.
        Includes vector illustration corresponding to the order state.
        """
        if settings.is_testing:
            logger.info("email.skipped_in_test", template="order_status", id_venta=id_venta)
            return

        smtp_password = settings.SMTP_PASSWORD.get_secret_value() if settings.SMTP_PASSWORD else ""
        if not settings.SMTP_USER or not smtp_password:
            logger.warning("email.smtp_not_configured", detail="SMTP credentials are empty. Email was skipped.")
            return

        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(
                None,
                EmailService._send_smtp_order_status,
                to_email,
                user_name,
                id_venta,
                tipo,
                titulo,
                mensaje,
                total_final,
                eta,
                motivo,
            )
            logger.info("email.sent_success", recipient=to_email, template="order_status", id_venta=id_venta, tipo=tipo)
        except Exception as exc:
            logger.error("email.sent_failed", recipient=to_email, id_venta=id_venta, error=str(exc))

    @staticmethod
    def _send_smtp_order_status(
        to_email: str,
        user_name: str,
        id_venta: int,
        tipo: str,
        titulo: str,
        mensaje: str,
        total_final: Optional[Decimal] = None,
        eta: Optional[datetime] = None,
        motivo: Optional[str] = None,
    ) -> None:
        smtp_password = settings.SMTP_PASSWORD.get_secret_value()
        if not settings.SMTP_USER or not smtp_password:
            logger.warning("email.smtp_not_configured", detail="SMTP credentials are empty. Email was skipped.")
            return

        image_map = {
            "PEDIDO_CONFIRMADO": "order_confirmed.png",
            "PEDIDO_PAGADO": "order_paid.png",
            "PEDIDO_PREPARANDO": "order_preparing.png",
            "PEDIDO_EN_CAMINO": "order_dispatched.png",
            "PEDIDO_ENTREGADO": "order_delivered.png",
            "PEDIDO_CANCELADO": "order_cancelled.png",
            "PEDIDO_REEMBOLSADO": "order_refunded.png",
        }

        badge_map = {
            "PEDIDO_CONFIRMADO": ("CONFIRMADO", "#fff7ed", "#c2410c", "#ffedd5"),
            "PEDIDO_PAGADO": ("PAGADO", "#f0fdf4", "#15803d", "#dcfce7"),
            "PEDIDO_PREPARANDO": ("EN PREPARACIÓN", "#fdf2f8", "#be185d", "#fce7f3"),
            "PEDIDO_EN_CAMINO": ("EN CAMINO", "#eff6ff", "#1d4ed8", "#dbeafe"),
            "PEDIDO_ENTREGADO": ("ENTREGADO", "#f0fdf4", "#166534", "#bbf7d0"),
            "PEDIDO_CANCELADO": ("CANCELADO", "#fef2f2", "#b91c1c", "#fee2e2"),
            "PEDIDO_REEMBOLSADO": ("REEMBOLSADO", "#faf5ff", "#6b21a8", "#f3e8ff"),
        }

        subject_map = {
            "PEDIDO_CONFIRMADO": f"🛒 ¡Pedido #{id_venta} recibido con éxito! — Mitrufely Web",
            "PEDIDO_PAGADO": f"💳 Pago verificado para tu pedido #{id_venta} — Mitrufely Web",
            "PEDIDO_PREPARANDO": f"👩‍🍳 Tu pedido #{id_venta} ya está en preparación — Mitrufely Web",
            "PEDIDO_EN_CAMINO": f"🛵 ¡Tu pedido #{id_venta} va en camino! — Mitrufely Web",
            "PEDIDO_ENTREGADO": f"🎉 ¡Pedido #{id_venta} entregado! — Mitrufely Web",
            "PEDIDO_CANCELADO": f"❌ Tu pedido #{id_venta} ha sido cancelado — Mitrufely Web",
            "PEDIDO_REEMBOLSADO": f"💰 Reembolso procesado para tu pedido #{id_venta} — Mitrufely Web",
        }

        tipo_str = str(tipo).upper()
        subject = subject_map.get(tipo_str, f"Actualización de tu pedido #{id_venta} — Mitrufely Web")
        badge_text, badge_bg, badge_color, badge_border = badge_map.get(
            tipo_str, ("ACTUALIZADO", "#f3f4f6", "#374151", "#e5e7eb")
        )
        img_file = image_map.get(tipo_str, "order_confirmed.png")
        img_dir = Path(__file__).resolve().parent.parent.parent / "static" / "images" / "email"
        img_path = img_dir / img_file

        msg = MIMEMultipart("related")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
        msg["To"] = to_email

        msg_alt = MIMEMultipart("alternative")
        msg.attach(msg_alt)

        frontend_url = settings.FRONTEND_URL
        tracking_url = f"{frontend_url}/profile"

        eta_str = eta.strftime("%d/%m/%Y %H:%M") if isinstance(eta, datetime) else (str(eta) if eta else None)
        total_str = f"S/ {total_final:.2f}" if total_final is not None else None

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{titulo}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Playfair+Display:ital,wght@1,600&display=swap');
                body {{
                    margin: 0; padding: 0; width: 100% !important; background-color: #fcf8f2;
                    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
                }}
                .wrapper {{ width: 100%; table-layout: fixed; background-color: #fcf8f2; padding: 40px 0; }}
                .container {{
                    max-width: 600px; margin: 0 auto; background-color: #ffffff;
                    border-radius: 16px; border: 1px solid #e9d5ca;
                    box-shadow: 0 8px 30px rgba(60, 47, 47, 0.04); overflow: hidden;
                }}
                .header {{
                    background: linear-gradient(135deg, #5c0f1b, #8c1c2b);
                    padding: 36px 20px; text-align: center; color: #ffffff;
                }}
                .header h1 {{
                    margin: 0; font-family: 'Playfair Display', Georgia, serif;
                    font-size: 28px; font-weight: bold; letter-spacing: 0.5px;
                }}
                .header p {{ margin: 6px 0 0 0; font-size: 14px; opacity: 0.9; }}
                .content {{ padding: 35px 30px; color: #3c2f2f; line-height: 1.6; }}
                .badge {{
                    display: inline-block; padding: 6px 16px; border-radius: 20px;
                    font-size: 12px; font-weight: 700; text-transform: uppercase;
                    letter-spacing: 0.8px; background-color: {badge_bg};
                    color: {badge_color}; border: 1px solid {badge_border};
                    margin-bottom: 15px;
                }}
                .illustration-container {{
                    text-align: center; margin: 20px 0; background: #ffffff;
                    padding: 15px; border-radius: 12px; border: 1px solid #f3e9e3;
                }}
                .illustration-container img {{
                    max-width: 250px; width: 100%; height: auto; border-radius: 8px;
                }}
                .order-card {{
                    background-color: #fdfaf6; border: 1px solid #f3e9e3;
                    border-radius: 12px; padding: 20px; margin: 25px 0;
                }}
                .order-row {{
                    display: flex; justify-content: space-between; padding: 8px 0;
                    border-bottom: 1px dashed #e9d5ca; font-size: 14px;
                }}
                .order-row:last-child {{ border-bottom: none; }}
                .order-label {{ font-weight: 600; color: #6b5c5c; }}
                .order-val {{ font-weight: 700; color: #3c2f2f; }}
                .btn-container {{ text-align: center; margin: 30px 0 10px 0; }}
                .btn {{
                    background-color: #5c0f1b; color: #ffffff !important;
                    padding: 14px 32px; text-decoration: none; font-size: 15px;
                    font-weight: 600; border-radius: 10px; display: inline-block;
                    box-shadow: 0 4px 14px rgba(92, 15, 27, 0.25);
                }}
                .footer {{
                    background-color: #fdfaf6; padding: 20px; text-align: center;
                    font-size: 12px; color: #8c7e7e; border-top: 1px solid #f3e9e3;
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
                        <div style="text-align: center;">
                            <span class="badge">{badge_text}</span>
                            <h2 style="margin: 5px 0 15px 0; color: #5c0f1b; font-size: 22px;">{titulo}</h2>
                        </div>
                        
                        <div class="illustration-container">
                            <img src="cid:status_illustration" alt="{titulo}">
                        </div>

                        <p style="font-size: 15px; text-align: center; margin: 15px 0;">
                            ¡Hola <strong>{user_name}</strong>! {mensaje}
                        </p>

                        <div class="order-card">
                            <div class="order-row">
                                <span class="order-label">Código de Pedido:</span>
                                <span class="order-val">#{id_venta}</span>
                            </div>
                            <div class="order-row">
                                <span class="order-label">Estado Actual:</span>
                                <span class="order-val" style="color: {badge_color};">{badge_text}</span>
                            </div>
                            {f'<div class="order-row"><span class="order-label">Total del Pedido:</span><span class="order-val">{total_str}</span></div>' if total_str else ''}
                            {f'<div class="order-row"><span class="order-label">Hora Estimada (ETA):</span><span class="order-val">{eta_str}</span></div>' if eta_str else ''}
                            {f'<div class="order-row"><span class="order-label">Detalle / Motivo:</span><span class="order-val">{motivo}</span></div>' if motivo else ''}
                        </div>

                        <div class="btn-container">
                            <a href="{tracking_url}" class="btn" target="_blank">Ver Mis Pedidos</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Si tienes preguntas sobre tu pedido, contáctanos a <a href="mailto:mitrufely.dev@gmail.com" style="color: #5c0f1b;">mitrufely.dev@gmail.com</a></p>
                        <p>© 2026 Mitrufely Web. Todos los derechos reservados.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        msg_alt.attach(MIMEText(html_content, "html"))

        if img_path and os.path.exists(img_path):
            try:
                with open(img_path, "rb") as f:
                    img_data = f.read()
                img = MIMEImage(img_data, _subtype="png")
                img.add_header("Content-ID", "<status_illustration>")
                img.add_header("Content-Disposition", "inline", filename=os.path.basename(img_path))
                msg.attach(img)
            except Exception as e:
                logger.warning("email.image_attach_failed", error=str(e))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, smtp_password)
            server.sendmail(settings.SMTP_FROM or settings.SMTP_USER, to_email, msg.as_string())

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

        # ── M-07 (CWE-532): solo loguear el enlace de reset en desarrollo.
        # En producción, loguear el token completo es una fuga de credencial:
        # quien tenga acceso a logs podría secuestrar resets de contraseña.
        if settings.is_development:
            logger.info("email.password_reset_link_generated", link=reset_link)
        else:
            logger.info("email.password_reset_link_generated", recipient=to_email)

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
