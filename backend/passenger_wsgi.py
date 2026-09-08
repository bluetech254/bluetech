import sys
import os

# Add backend root to path so 'app' package is importable
sys.path.insert(0, os.path.dirname(__file__))

# Import FastAPI app
from app.main import app

# Bridge ASGI (FastAPI) -> WSGI (Passenger)
from a2wsgi import ASGIMiddleware

application = ASGIMiddleware(app)
