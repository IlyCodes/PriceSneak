from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import auth, products, competitors, pricing_rules, global_competitors, dashboard, alerts, admin
from backend.core.mongodb import connect_to_mongo, close_mongo_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(
    title="PriceSneak API",
    description="Backend API for PriceSneak Competitive Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Configuration CORS pour autoriser le frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Port par défaut de Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(competitors.router, prefix="/api/products", tags=["Competitors"])
app.include_router(pricing_rules.router, prefix="/api/pricing-rules", tags=["Pricing Rules"])
app.include_router(global_competitors.router, prefix="/api/competitors", tags=["Global Competitors"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/")
async def root():
    return {"message": "Welcome to PriceSneak API. The engine is ready."}
