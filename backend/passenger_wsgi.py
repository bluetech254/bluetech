import sys
import os

# Add backend root to path so 'app' package is importable
sys.path.insert(0, os.path.dirname(__file__))

# Load .env BEFORE importing the app so all settings are available
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Import FastAPI app
from app.main import app

# Bridge ASGI (FastAPI) -> WSGI (Passenger)
from a2wsgi import ASGIMiddleware

application = ASGIMiddleware(app)
