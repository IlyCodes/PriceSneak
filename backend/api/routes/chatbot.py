from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any
from google import genai
from google.genai import types

from backend.api import deps
from backend.core.config import settings
from backend.models.faq import FAQ
from backend.models.user import User
from backend.schemas.faq import ChatRequest

router = APIRouter()

@router.post("/chat")
async def chat(
    request: ChatRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La fonctionnalité Chatbot n'est pas configurée (Clé API manquante)."
        )

    # Fetch active FAQs
    faqs = db.query(FAQ).filter(FAQ.is_active == True).all()
    faq_context = "\\n".join([f"Q: {faq.question}\\nA: {faq.answer}" for faq in faqs])

    system_instruction = f"""
Tu es l'assistant IA officiel de PriceSneak, une plateforme de veille tarifaire (suivi des prix de concurrents).
Ta mission est d'aider les utilisateurs avec courtoisie, clarté et précision, en utilisant uniquement les connaissances fournies ci-dessous.
Si une question n'est pas couverte par les FAQs ci-dessous, dis poliment que tu ne sais pas et conseille de contacter le support.

FAQs PriceSneak:
{faq_context}
"""

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    # Format messages for the Gemini API
    # Gemini uses 'user' and 'model' roles
    history = []
    for msg in request.messages[:-1]:
        history.append(
            types.Content(
                role=msg.role,
                parts=[types.Part.from_text(text=msg.text)]
            )
        )
        
    current_message = request.messages[-1].text

    try:
        chat_session = client.chats.create(
            model="gemini-3.6-flash",
            history=history,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
            )
        )
        response = chat_session.send_message(current_message)
        
        return {"response": response.text}
    except Exception as e:
        import traceback
        with open("chatbot_error.log", "w") as f:
            f.write(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la communication avec l'IA: {str(e)}"
        )
