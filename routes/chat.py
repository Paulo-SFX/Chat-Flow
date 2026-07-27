"""
routes/chat.py
-----------------
Rotas responsáveis pela tela principal do chat:
- Renderização da interface (sidebar, conversas, área de mensagens)
- API para listar conversas do usuário
- API para carregar histórico de mensagens de uma sala
- API para pesquisar mensagens
"""

from flask import Blueprint, render_template, session, jsonify, request

from models.user import UserModel
from models.room import RoomModel
from models.message import MessageModel
from routes.decorators import login_required

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/")
@login_required
def index():
    usuario = UserModel.buscar_por_id(session["usuario_id"])
    salas = RoomModel.listar_salas_do_usuario(usuario["id"])
    online = UserModel.listar_online()
    return render_template(
        "chat.html", usuario=usuario, salas=salas, usuarios_online=online
    )


@chat_bp.route("/api/conversas")
@login_required
def api_conversas():
    salas = RoomModel.listar_salas_do_usuario(session["usuario_id"])
    # Serializa datetimes
    for s in salas:
        if s.get("ultima_mensagem_hora"):
            s["ultima_mensagem_hora"] = s["ultima_mensagem_hora"].isoformat()
        if s.get("ultima_leitura"):
            s["ultima_leitura"] = s["ultima_leitura"].isoformat()
    return jsonify(salas)


@chat_bp.route("/api/salas/<int:sala_id>/historico")
@login_required
def api_historico(sala_id):
    if not RoomModel.usuario_participa(sala_id, session["usuario_id"]):
        return jsonify({"erro": "Você não participa desta sala"}), 403

    antes_de_id = request.args.get("antes_de", type=int)
    mensagens = MessageModel.listar_historico(sala_id, antes_de_id=antes_de_id)
    for m in mensagens:
        m["enviado_em"] = m["enviado_em"].isoformat()

    RoomModel.marcar_como_lida(sala_id, session["usuario_id"])
    return jsonify(mensagens)


@chat_bp.route("/api/salas/<int:sala_id>/participantes")
@login_required
def api_participantes(sala_id):
    if not RoomModel.usuario_participa(sala_id, session["usuario_id"]):
        return jsonify({"erro": "Você não participa desta sala"}), 403
    return jsonify(RoomModel.listar_participantes(sala_id))


@chat_bp.route("/api/pesquisar/mensagens")
@login_required
def api_pesquisar_mensagens():
    termo = request.args.get("q", "").strip()
    sala_id = request.args.get("sala_id", type=int)
    if not termo:
        return jsonify([])

    if sala_id:
        if not RoomModel.usuario_participa(sala_id, session["usuario_id"]):
            return jsonify({"erro": "Você não participa desta sala"}), 403
        resultados = MessageModel.pesquisar_mensagens(sala_id, termo)
    else:
        resultados = MessageModel.pesquisar_mensagens_usuario(session["usuario_id"], termo)

    for m in resultados:
        m["enviado_em"] = m["enviado_em"].isoformat()
    return jsonify(resultados)


@chat_bp.route("/api/pesquisar/usuarios")
@login_required
def api_pesquisar_usuarios():
    termo = request.args.get("q", "").strip()
    if not termo:
        return jsonify([])
    return jsonify(UserModel.pesquisar_usuarios(termo, session["usuario_id"]))
