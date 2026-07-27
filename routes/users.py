"""
routes/users.py
------------------
Rotas responsáveis pelo gerenciamento social de usuários:
- Bloquear / desbloquear usuários
- Denunciar usuários
- Visualizar perfil de outro usuário
"""

from flask import Blueprint, request, jsonify, session, render_template, abort

from models.user import UserModel
from routes.decorators import login_required

users_bp = Blueprint("users", __name__)


@users_bp.route("/perfil/<int:usuario_id>")
@login_required
def ver_perfil(usuario_id):
    usuario = UserModel.buscar_por_id(usuario_id)
    if not usuario:
        abort(404)
    bloqueado = UserModel.esta_bloqueado(session["usuario_id"], usuario_id)
    return render_template(
        "profile.html", usuario=usuario, bloqueado=bloqueado, eh_proprio_perfil=(usuario_id == session["usuario_id"])
    )


@users_bp.route("/api/usuarios/<int:usuario_id>/bloquear", methods=["POST"])
@login_required
def bloquear(usuario_id):
    if usuario_id == session["usuario_id"]:
        return jsonify({"erro": "Você não pode bloquear a si mesmo."}), 400
    UserModel.bloquear_usuario(session["usuario_id"], usuario_id)
    return jsonify({"sucesso": True})


@users_bp.route("/api/usuarios/<int:usuario_id>/desbloquear", methods=["POST"])
@login_required
def desbloquear(usuario_id):
    UserModel.desbloquear_usuario(session["usuario_id"], usuario_id)
    return jsonify({"sucesso": True})


@users_bp.route("/api/usuarios/bloqueados")
@login_required
def listar_bloqueados():
    return jsonify(UserModel.listar_bloqueados(session["usuario_id"]))


@users_bp.route("/api/usuarios/<int:usuario_id>/denunciar", methods=["POST"])
@login_required
def denunciar(usuario_id):
    dados = request.get_json(silent=True) or {}
    motivo = (dados.get("motivo") or "").strip()
    detalhes = (dados.get("detalhes") or "").strip()

    if not motivo:
        return jsonify({"erro": "Informe o motivo da denúncia."}), 400
    if usuario_id == session["usuario_id"]:
        return jsonify({"erro": "Você não pode denunciar a si mesmo."}), 400

    UserModel.denunciar_usuario(session["usuario_id"], usuario_id, motivo, detalhes)
    return jsonify({"sucesso": True, "mensagem": "Denúncia enviada. Nossa equipe irá analisar."})
