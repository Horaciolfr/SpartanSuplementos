import asyncio
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone
import os

from app.core.config import settings

logger = logging.getLogger("spartan.email")

DEV_MAIL_LOG = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "mail_dev.log")

def _generate_html_template(title: str, subtitle: str, code: str, instructions: str, alert_text: str = "") -> str:
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>{title}</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #080808;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #e5e5e5;
    }}
    .container {{
      max-width: 580px;
      margin: 40px auto;
      background-color: #0e0e0e;
      border: 1px solid #222222;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
    }}
    .header {{
      background-color: #121212;
      border-bottom: 2px solid #f2e500;
      padding: 28px 32px;
      text-align: center;
    }}
    .header h1 {{
      margin: 0;
      color: #ffffff;
      font-size: 22px;
      letter-spacing: 2px;
      text-transform: uppercase;
      font-weight: 800;
    }}
    .header span {{
      color: #f2e500;
    }}
    .content {{
      padding: 36px 32px;
    }}
    .title {{
      font-size: 18px;
      color: #ffffff;
      margin-bottom: 12px;
      font-weight: 700;
    }}
    .text {{
      font-size: 14px;
      line-height: 1.6;
      color: #b0b0b0;
      margin-bottom: 24px;
    }}
    .code-box {{
      background-color: #161616;
      border: 1px dashed #f2e500;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 28px 0;
    }}
    .code {{
      font-family: 'Courier New', Courier, monospace;
      font-size: 34px;
      font-weight: 900;
      color: #f2e500;
      letter-spacing: 8px;
      margin: 0;
    }}
    .expiry {{
      font-size: 12px;
      color: #888888;
      margin-top: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }}
    .alert {{
      background-color: rgba(242, 229, 0, 0.05);
      border-left: 3px solid #f2e500;
      padding: 12px 16px;
      font-size: 12px;
      color: #ccc7ab;
      margin-top: 20px;
      border-radius: 4px;
    }}
    .footer {{
      background-color: #0a0a0a;
      border-top: 1px solid #1a1a1a;
      padding: 20px 32px;
      text-align: center;
      font-size: 11px;
      color: #666666;
      letter-spacing: 0.5px;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SPARTAN <span>SUPLEMENTOS</span></h1>
    </div>
    <div class="content">
      <div class="title">{title}</div>
      <div class="text">{subtitle}</div>
      <div class="text">{instructions}</div>
      <div class="code-box">
        <div class="code">{code}</div>
        <div class="expiry">Válido por 15 minutos</div>
      </div>
      {f'<div class="alert">{alert_text}</div>' if alert_text else ''}
    </div>
    <div class="footer">
      &copy; {datetime.now(timezone.utc).year} Spartan Suplementos Bolivia &bull; Nutrición y Rendimiento de Grado Élite
    </div>
  </div>
</body>
</html>
"""

def _send_smtp_sync(to_email: str, subject: str, html_content: str, code: str, mail_type: str) -> bool:
    """Envía el correo mediante SMTP o registra en logs en modo desarrollo."""
    # Los codigos solo se escriben localmente cuando la depuracion fue
    # habilitada de forma explicita. Nunca deben aparecer en stdout.
    if settings.EMAIL_DEBUG_CODES:
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        dev_entry = f"[{timestamp}] [{mail_type}] DESTINATARIO: {to_email} | CODIGO: {code} | ASUNTO: {subject}\n"
        try:
            with open(DEV_MAIL_LOG, "a", encoding="utf-8") as f:
                f.write(dev_entry)
            logger.warning("EMAIL_DEBUG_CODES activo: codigo escrito en el registro local de desarrollo.")
        except Exception as err:
            logger.warning("No se pudo escribir en mail_dev.log: %s", err)

    # Si hay credenciales configuradas, intentar envío real vía SMTP
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = to_email

            part_html = MIMEText(html_content, "html", "utf-8")
            msg.attach(part_html)

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
            logger.info("Correo SMTP enviado exitosamente a %s", to_email)
            return True
        except Exception as err:
            logger.error("Error al enviar correo SMTP a %s: %s (código registrado en log local)", to_email, err)
            return False

    return True

async def send_verification_email(email: str, nombres: str, code: str) -> bool:
    """Envía el código de verificación de 6 dígitos para activación de cuenta de cliente."""
    subject = f"{code} es tu código de verificación Spartan"
    html = _generate_html_template(
        title=f"¡Bienvenido a Spartan Suplementos, {nombres}!",
        subtitle="Tu cuenta de Atleta Spartan ha sido creada exitosamente.",
        code=code,
        instructions="Para activar tu perfil y acceder al análisis biométrico, recomendaciones somatotípicas y planes nutricionales, ingresa este código en la pantalla de verificación:",
        alert_text="Si tú no creaste esta cuenta, puedes desestimar este correo con total seguridad."
    )
    return await asyncio.to_thread(_send_smtp_sync, email, subject, html, code, "VERIFICACION_CUENTA")

async def send_password_reset_email(email: str, nombres: str, code: str) -> bool:
    """Envía el código de recuperación de contraseña de 6 dígitos."""
    subject = f"{code} es tu código de recuperación Spartan"
    html = _generate_html_template(
        title="Solicitud de Restablecimiento de Contraseña",
        subtitle=f"Hola {nombres}, hemos recibido una solicitud para restablecer la contraseña de tu cuenta.",
        code=code,
        instructions="Ingresa el siguiente código de seguridad en la aplicación para configurar una nueva contraseña:",
        alert_text="Por tu seguridad, nunca compartas este código con nadie. El equipo de Spartan nunca te pedirá tu código por teléfono ni chat."
    )
    return await asyncio.to_thread(_send_smtp_sync, email, subject, html, code, "RECUPERACION_PASSWORD")
