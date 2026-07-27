"""
routes/upload.py
-------------------
Rotas responsáveis pelo upload de arquivos:
- Upload de foto de perfil (avatar)
- Upload de imagens enviadas dentro do chat
"""

import os
import uuid
from flask import Blueprint, request, jsonify, session, current_app, send_from_directory
from werkzeug.utils import secure_filename

from models.user import UserModel
from routes.decorators import login_required

upload_bp = Blueprint("upload", __name__)


def extensao_permitida(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in current_app.config["ALLOWED_IMAGE_EXTENSIONS"]
    )


def gerar_nome_unico(filename):
    ext = filename.rsplit(".", 1)[1].lower()
    return f"{uuid.uuid4().hex}.{ext}"


@upload_bp.route("/uploads/avatars/<path:filename>")
def servir_avatar(filename):
    return send_from_directory(current_app.config["AVATAR_FOLDER"], filename)


@upload_bp.route("/uploads/chat_images/<path:filename>")
def servir_imagem_chat(filename):
    return send_from_directory(current_app.config["CHAT_IMAGES_FOLDER"], filename)


@upload_bp.route("/api/upload/avatar", methods=["POST"])
@login_required
def upload_avatar():
    if "arquivo" not in request.files:
        return jsonify({"erro": "Nenhum arquivo enviado."}), 400

    arquivo = request.files["arquivo"]
    if arquivo.filename == "":
        return jsonify({"erro": "Nenhum arquivo selecionado."}), 400

    if not extensao_permitida(arquivo.filename):
        return jsonify({"erro": "Formato de imagem não permitido."}), 400

    nome_seguro = secure_filename(arquivo.filename)
    nome_final = gerar_nome_unico(nome_seguro)
    caminho = os.path.join(current_app.config["AVATAR_FOLDER"], nome_final)
    arquivo.save(caminho)

    UserModel.atualizar_foto_perfil(session["usuario_id"], nome_final)
    return jsonify({"sucesso": True, "foto_perfil": nome_final})


@upload_bp.route("/api/upload/chat-image", methods=["POST"])
@login_required
def upload_chat_image():
    if "arquivo" not in request.files:
        return jsonify({"erro": "Nenhum arquivo enviado."}), 400

    arquivo = request.files["arquivo"]
    sala_id = request.form.get("sala_id")

    if arquivo.filename == "":
        return jsonify({"erro": "Nenhum arquivo selecionado."}), 400
    if not sala_id:
        return jsonify({"erro": "Sala não informada."}), 400
    if not extensao_permitida(arquivo.filename):
        return jsonify({"erro": "Formato de imagem não permitido."}), 400

    nome_seguro = secure_filename(arquivo.filename)
    nome_final = gerar_nome_unico(nome_seguro)
    caminho = os.path.join(current_app.config["CHAT_IMAGES_FOLDER"], nome_final)
    arquivo.save(caminho)

    return jsonify({"sucesso": True, "imagem_url": nome_final})
