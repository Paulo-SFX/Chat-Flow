"""
app.py
------
Ponto de entrada da aplicação.

Responsabilidades:
- Criar e configurar a instância Flask.
- Inicializar o pool de conexões MySQL e criar as tabelas automaticamente.
- Registrar os Blueprints (rotas) da aplicação.
- Inicializar o Flask-SocketIO e registrar os eventos de tempo real.
- Definir o contexto global de templates (ex.: usuário logado).
"""

import os

from flask import Flask, session
from flask_socketio import SocketIO

from config import Config
from database.db import init_pool
from models.user import UserModel

from routes.auth import auth_bp
from routes.chat import chat_bp
from routes.rooms import rooms_bp
from routes.users import users_bp
from routes.upload import upload_bp
from routes.settings import settings_bp

from sockets.events import registrar_eventos


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Garante que as pastas de upload existam
    os.makedirs(app.config["AVATAR_FOLDER"], exist_ok=True)
    os.makedirs(app.config["CHAT_IMAGES_FOLDER"], exist_ok=True)

    # Inicializa o MySQL (cria banco/tabelas se necessário)
    init_pool(app)

    # Registra os Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(rooms_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(settings_bp)

    # Disponibiliza o usuário logado em todos os templates
    @app.context_processor
    def injetar_usuario():
        usuario = None
        if session.get("usuario_id"):
            usuario = UserModel.buscar_por_id(session["usuario_id"])
        return dict(usuario_logado=usuario)

    # ------------------------------------------------------------------
    # Tratamento de erros
    # ------------------------------------------------------------------
    @app.errorhandler(404)
    def pagina_nao_encontrada(e):
        return "Página não encontrada (404).", 404

    @app.errorhandler(413)
    def arquivo_muito_grande(e):
        return {"erro": "Arquivo excede o tamanho máximo permitido (8MB)."}, 413

    @app.errorhandler(500)
    def erro_interno(e):
        return "Erro interno do servidor (500).", 500

    return app


app = create_app()
socketio = SocketIO(
    app,
    async_mode=app.config["SOCKETIO_ASYNC_MODE"],
    cors_allowed_origins="*",
    manage_session=True,
)
registrar_eventos(socketio)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
