"""
cPanel Passenger WSGI entry point.

cPanel's "Setup Python App" feature uses Phusion Passenger.
FastAPI is ASGI-native but Passenger expects a WSGI 'application' callable.
We use asgiref to bridge ASGI → WSGI.

Requirements: add 'asgiref' to requirements.txt
"""
import sys
import os

# Ensure the project root is in path
sys.path.insert(0, os.path.dirname(__file__))

# Load production .env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Import FastAPI app
from app.main import app

# Bridge ASGI (FastAPI) → WSGI (Passenger)
from asgiref.wsgi import WsgiToAsgi as _  # noqa — ensure import works
from asgiref.sync import async_to_sync

# Passenger requires a top-level 'application' callable
# Use a2wsgi for a clean ASGI-to-WSGI bridge
from a2wsgi import ASGIMiddleware
application = ASGIMiddleware(app)
