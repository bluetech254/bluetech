from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import products, orders, bookings, tracking, delivery_zones, services, auth

# Create FastAPI app
app = FastAPI(
    title="Blue Technology API",
    description="Backend API for electronics repair booking and e-commerce platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if not settings.DEBUG else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(bookings.router)
app.include_router(tracking.router)
app.include_router(delivery_zones.router)
app.include_router(services.router)

@app.get("/")
def root():
    """API root endpoint"""
    return {
        "message": "Blue Technology API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
