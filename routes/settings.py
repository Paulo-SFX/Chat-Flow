"""
routes/settings.py
---------------------
Rotas responsáveis pela página de configurações do usuário:
- Alterar nome de usuário
- Alterar senha
- Alterar bio
- Renderização da página de configurações
"""

from flask import Blueprint, render_template, request, jsonify, session

from models.user import UserModel
from routes.decorators import login_required

settings_bp = Blueprint("settings", __name__)


@settings_bp.route("/configuracoes")
@login_required
def configuracoes():
    usuario = UserModel.buscar_por_id(session["usuario_id"])
    return render_template("settings.html", usuario=usuario)


@settings_bp.route("/api/configuracoes/nome-usuario", methods=["POST"])
@login_required
def alterar_nome_usuario():
    dados = request.get_json(silent=True) or {}
    novo_nome = (dados.get("nome_usuario") or "").strip()

    if len(novo_nome) < 3 or len(novo_nome) > 30:
        return jsonify({"erro": "O nome de usuário deve ter entre 3 e 30 caracteres."}), 400

    existente = UserModel.buscar_por_nome_usuario(novo_nome)
    if existente and existente["id"] != session["usuario_id"]:
        return jsonify({"erro": "Este nome de usuário já está em uso."}), 400

    UserModel.atualizar_nome_usuario(session["usuario_id"], novo_nome)
    session["nome_usuario"] = novo_nome
    return jsonify({"sucesso": True, "nome_usuario": novo_nome})


@settings_bp.route("/api/configuracoes/senha", methods=["POST"])
@login_required
def alterar_senha():
    dados = request.get_json(silent=True) or {}
    senha_atual = dados.get("senha_atual", "")
    nova_senha = dados.get("nova_senha", "")
    confirmar_senha = dados.get("confirmar_senha", "")

    usuario = UserModel.buscar_por_id(session["usuario_id"])
    if not UserModel.verificar_senha(usuario["senha_hash"], senha_atual):
        return jsonify({"erro": "Senha atual incorreta."}), 400
    if len(nova_senha) < 6:
        return jsonify({"erro": "A nova senha deve ter pelo menos 6 caracteres."}), 400
    if nova_senha != confirmar_senha:
        return jsonify({"erro": "As senhas não coincidem."}), 400

    UserModel.atualizar_senha(session["usuario_id"], nova_senha)
    return jsonify({"sucesso": True, "mensagem": "Senha alterada com sucesso."})


@settings_bp.route("/api/configuracoes/bio", methods=["POST"])
@login_required
def alterar_bio():
    dados = request.get_json(silent=True) or {}
    bio = (dados.get("bio") or "").strip()[:255]
    UserModel.atualizar_bio(session["usuario_id"], bio)
    return jsonify({"sucesso": True, "bio": bio})
