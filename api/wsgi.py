"""실행 진입점: flask --app wsgi run  /  gunicorn wsgi:app"""

from netproof_api import create_app

app = create_app()
