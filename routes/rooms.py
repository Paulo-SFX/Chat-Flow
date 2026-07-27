"""
routes/rooms.py
------------------
Rotas responsáveis pelo gerenciamento de salas de chat:
- Criação de salas em grupo
- Entrar / sair de salas
- Abrir (ou criar) conversa privada com outro usuário
- Listagem de salas públicas disponíveis para entrar
"""

from flask import Blueprint, request, jsonify, session

from models.room import RoomModel
from models.user import UserModel
from routes.decorators import login_required

rooms_bp = Blueprint("rooms", __name__)


@rooms_bp.route("/api/salas", methods=["POST"])
@login_required
def criar_sala():
    dados = request.get_json(silent=True) or {}
    nome = (dados.get("nome") or "").strip()
    descricao = (dados.get("descricao") or "").strip()
    membros_ids = dados.get("membros_ids") or []

    if len(nome) < 3:
        return jsonify({"erro": "O nome da sala deve ter pelo menos 3 caracteres."}), 400
    if len(nome) > 100:
        return jsonify({"erro": "O nome da sala é muito longo."}), 400

    sala_id = RoomModel.criar_sala(
        nome=nome,
        descricao=descricao,
        tipo="grupo",
        criador_id=session["usuario_id"],
        membros_ids=membros_ids,
    )
    sala = RoomModel.buscar_por_id(sala_id)
    return jsonify(sala), 201


@rooms_bp.route("/api/salas/disponiveis")
@login_required
def salas_disponiveis():
    return jsonify(RoomModel.salas_publicas_disponiveis(session["usuario_id"]))


@rooms_bp.route("/api/salas/<int:sala_id>/entrar", methods=["POST"])
@login_required
def entrar_sala(sala_id):
    sala = RoomModel.buscar_por_id(sala_id)
    if not sala:
        return jsonify({"erro": "Sala não encontrada"}), 404
    RoomModel.entrar_na_sala(sala_id, session["usuario_id"])
    return jsonify({"sucesso": True})


@rooms_bp.route("/api/salas/<int:sala_id>/sair", methods=["POST"])
@login_required
def sair_sala(sala_id):
    RoomModel.sair_da_sala(sala_id, session["usuario_id"])
    return jsonify({"sucesso": True})


@rooms_bp.route("/api/conversas/privada/<int:outro_usuario_id>", methods=["POST"])
@login_required
def abrir_conversa_privada(outro_usuario_id):
    usuario_id = session["usuario_id"]

    if outro_usuario_id == usuario_id:
        return jsonify({"erro": "Você não pode iniciar uma conversa consigo mesmo."}), 400

    outro = UserModel.buscar_por_id(outro_usuario_id)
    if not outro:
        return jsonify({"erro": "Usuário não encontrado."}), 404

    if UserModel.esta_bloqueado(usuario_id, outro_usuario_id):
        return jsonify({"erro": "Não é possível conversar com este usuário."}), 403

    sala_id = RoomModel.buscar_ou_criar_privada(usuario_id, outro_usuario_id)
    return jsonify({"sala_id": sala_id})
