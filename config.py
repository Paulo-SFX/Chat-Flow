"""
config.py
---------
Configurações centrais da aplicação (Flask, MySQL, Upload, Sessão).
Todas as variáveis sensíveis podem ser sobrescritas por variáveis de ambiente.
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

# Carrega variáveis de ambiente do arquivo .env (se existir) antes de
# qualquer leitura via os.environ abaixo.
load_dotenv()


class Config:
    # Segurança / Sessão
    SECRET_KEY = os.environ.get("SECRET_KEY", "troque-esta-chave-em-producao")
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    # MySQL
    MYSQL_HOST = os.environ.get("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.environ.get("MYSQL_PORT", 3306))
    MYSQL_USER = os.environ.get("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD", "")
    MYSQL_DB = os.environ.get("MYSQL_DB", "chat_app")

    # Uploads
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
    AVATAR_FOLDER = os.path.join(UPLOAD_FOLDER, "avatars")
    CHAT_IMAGES_FOLDER = os.path.join(UPLOAD_FOLDER, "chat_images")
    ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
    MAX_CONTENT_LENGTH = 8 * 1024 * 1024  # 8 MB

    # SocketIO
    # "threading" não depende de monkey patching (eventlet/gevent) e evita
    # problemas de compatibilidade com versões novas do Python (ex: 3.13).
    # Para uso em produção com muitos usuários simultâneos, "eventlet" ou
    # "gevent" escalam melhor, mas exigem Python 3.11/3.12 hoje em dia.
    SOCKETIO_ASYNC_MODE = "threading"
