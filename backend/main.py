from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="PriceSneak API",
    description="Backend API for PriceSneak Competitive Intelligence Platform",
    version="1.0.0"
)

# Configuration CORS pour autoriser le frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Port par défaut de Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to PriceSneak API. The engine is ready."}
