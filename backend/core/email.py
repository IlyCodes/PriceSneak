import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from backend.core.config import settings

logger = logging.getLogger(__name__)

def _send_email(to_email: str, subject: str, html_body: str):
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"SMTP non configuré. Mock: Envoi à {to_email} | Sujet: {subject}")
        print("\n" + "=" * 50)
        print(f"📧 EMAIL MOCK: Sending to {to_email}")
        print(f"SUBJECT: {subject}")
        print(f"BODY:\n{html_body}")
        print("=" * 50 + "\n")
        return

    msg = MIMEMultipart()
    msg['From'] = settings.SMTP_FROM_EMAIL
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(html_body, 'html'))

    try:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"Email envoyé avec succès à {to_email}")
    except Exception as e:
        logger.error(f"Erreur d'envoi d'email à {to_email}: {e}")

def send_verification_email(to_email: str, code: str):
    subject = "Vérifiez votre adresse email PriceSneak"
    body = f"""
    <!DOCTYPE html>
    <html>
      <body style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="margin: 0; color: #2563eb; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">PriceSneak</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px 40px; text-align: center;">
              <h2 style="margin: 0 0 15px 0; color: #1e293b; font-size: 20px; font-weight: 600;">Vérifiez votre adresse email</h2>
              <p style="margin: 0 0 25px 0; color: #475569; font-size: 15px; line-height: 1.6;">Bienvenue ! Pour activer votre compte et sécuriser votre accès, veuillez utiliser le code de vérification ci-dessous.</p>
              
              <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <h1 style="margin: 0; color: #0f172a; font-size: 32px; font-weight: 700; letter-spacing: 8px;">{code}</h1>
              </div>
              
              <p style="margin: 0; color: #64748b; font-size: 14px;">Entrez ce code sur la page de vérification. Ce code est valable pendant 15 minutes.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">Ceci est un message automatique, merci de ne pas y répondre.<br/>© 2026 PriceSneak.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """
    _send_email(to_email, subject, body)

def send_price_alert_email(to_email: str, product_name: str, rule_name: str, old_price: float, new_price: float, comp_price: float):
    subject = f"PriceSneak Alerte : Ajustement de prix pour {product_name}"
    
    direction = "augmenté" if new_price > old_price else "baissé"
    color = "#ef4444" if new_price > old_price else "#10b981"
    
    body = f"""
    <!DOCTYPE html>
    <html>
      <body style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="margin: 0; color: #2563eb; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">PriceSneak</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="margin: 0 0 15px 0; color: #1e293b; font-size: 20px; font-weight: 600; text-align: center;">Alerte de Prix Automatisée ⚡</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">La règle d'automatisation <strong>{rule_name}</strong> a détecté un changement de prix chez un concurrent (<strong>{comp_price:.2f}</strong>).</p>
              
              <p style="margin: 0 0 15px 0; color: #475569; font-size: 15px;">Le prix de votre produit <strong>{product_name}</strong> a été automatiquement <span style="color: {color}; font-weight: 600;">{direction}</span> :</p>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px; border-right: 1px solid #e2e8f0; text-align: center; width: 50%;">
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Ancien prix</p>
                    <p style="margin: 0; color: #94a3b8; font-size: 20px; font-weight: 500; text-decoration: line-through;">{old_price:.2f}</p>
                  </td>
                  <td style="padding: 20px; text-align: center; width: 50%;">
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Nouveau prix</p>
                    <p style="margin: 0; color: {color}; font-size: 24px; font-weight: 700;">{new_price:.2f}</p>
                  </td>
                </tr>
              </table>
              
              <div style="text-align: center;">
                <a href="http://localhost:5173/dashboard" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; transition: background-color 0.2s;">Accéder au tableau de bord</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">Vous recevez cet email car les notifications sont activées dans vos paramètres.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """
    _send_email(to_email, subject, body)

def send_security_alert_email(to_email: str, action: str):
    if action == "password_changed":
        title = "Mot de passe modifié"
        desc = "Le mot de passe de votre compte PriceSneak a été modifié avec succès."
    elif action == "email_changed":
        title = "Adresse email modifiée"
        desc = "L'adresse email associée à votre compte PriceSneak a été modifiée avec succès."
    else:
        title = "Alerte de sécurité"
        desc = "Une modification de sécurité a été effectuée sur votre compte."

    subject = f"PriceSneak Sécurité : {title}"
    body = f"""
    <!DOCTYPE html>
    <html>
      <body style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="margin: 0; color: #2563eb; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">PriceSneak</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px 40px; text-align: center;">
              <h2 style="margin: 0 0 15px 0; color: #1e293b; font-size: 20px; font-weight: 600;">{title} 🔒</h2>
              <p style="margin: 0 0 25px 0; color: #475569; font-size: 15px; line-height: 1.6;">{desc}</p>
              
              <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 15px; margin-bottom: 25px;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">Si vous n'êtes pas à l'origine de cette action, veuillez nous contacter immédiatement pour sécuriser votre compte.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">Ceci est un message automatique de sécurité.<br/>© 2026 PriceSneak.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """
    _send_email(to_email, subject, body)
