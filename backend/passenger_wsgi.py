import sys
import os

BASE_DIR = '/home2/fixitblu/backend'

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.chdir(BASE_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, '.env'))

from app.main import app

# Use asgiref's ASGI->WSGI adapter instead of a2wsgi
# asgiref manages its own event loop more reliably under Passenger
from asgiref.wsgi import WsgiToAsgi  # noqa - verify it exists

# ASGIToWSGI: wraps ASGI app for WSGI server (Passenger)
# asgiref >= 3.2 has this
try:
    from asgiref.sync import AsyncToSync
    import asyncio

    class ASGIToWSGI:
        """Minimal ASGI-to-WSGI bridge using asgiref."""
        def __init__(self, asgi_app):
            self.asgi_app = asgi_app

        def __call__(self, environ, start_response):
            # Build ASGI scope from WSGI environ
            scope = {
                'type': 'http',
                'asgi': {'version': '3.0'},
                'http_version': environ.get('SERVER_PROTOCOL', 'HTTP/1.1').split('/')[-1],
                'method': environ['REQUEST_METHOD'].upper(),
                'headers': [
                    (k[5:].lower().replace('_', '-').encode(), v.encode())
                    for k, v in environ.items()
                    if k.startswith('HTTP_')
                ] + [
                    (b'content-type', environ.get('CONTENT_TYPE', '').encode()),
                    (b'content-length', environ.get('CONTENT_LENGTH', '0').encode()),
                ],
                'path': environ.get('PATH_INFO', '/'),
                'query_string': environ.get('QUERY_STRING', '').encode(),
                'root_path': environ.get('SCRIPT_NAME', ''),
                'scheme': environ.get('wsgi.url_scheme', 'http'),
                'server': (environ.get('SERVER_NAME', 'localhost'), int(environ.get('SERVER_PORT', 80))),
            }

            body = environ.get('wsgi.input', None)
            try:
                content_length = int(environ.get('CONTENT_LENGTH') or 0)
            except (ValueError, TypeError):
                content_length = 0
            if body and content_length > 0:
                request_body = body.read(content_length)
            else:
                request_body = b''

            response_started = []
            response_body = []

            async def run():
                async def receive():
                    return {'type': 'http.request', 'body': request_body, 'more_body': False}

                async def send(message):
                    if message['type'] == 'http.response.start':
                        response_started.append((message['status'], message.get('headers', [])))
                    elif message['type'] == 'http.response.body':
                        response_body.append(message.get('body', b''))

                await self.asgi_app(scope, receive, send)

            # Run in a new event loop
            loop = asyncio.new_event_loop()
            try:
                loop.run_until_complete(run())
            finally:
                loop.close()

            if response_started:
                status_code, headers = response_started[0]
                status_str = f"{status_code} {_status_phrase(status_code)}"
                wsgi_headers = [(k.decode(), v.decode()) for k, v in headers]
                start_response(status_str, wsgi_headers)
            else:
                start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])

            return response_body

    def _status_phrase(code):
        phrases = {200: 'OK', 201: 'Created', 204: 'No Content',
                   301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
                   400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
                   404: 'Not Found', 405: 'Method Not Allowed', 422: 'Unprocessable Entity',
                   500: 'Internal Server Error'}
        return phrases.get(code, 'Unknown')

    application = ASGIToWSGI(app)

except Exception as e:
    # Fallback to a2wsgi if above fails
    from a2wsgi import ASGIMiddleware
    application = ASGIMiddleware(app)
