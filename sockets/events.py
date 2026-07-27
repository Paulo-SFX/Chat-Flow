"""
sockets/events.py
--------------------
Eventos Flask-SocketIO responsáveis pela comunicação em tempo real:
- Conexão / desconexão de usuários (status online)
- Entrar / sair de salas (rooms do Socket.IO)
- Envio e recebimento de mensagens (texto, emoji, imagem)
- Indicador de "digitando..."
- Notificações de novas mensagens / contador de não lidas
"""

from flask import session
from flask_socketio import join_room, leave_room, emit

from models.user import UserModel
from models.room import RoomModel
from models.message import MessageModel

# Mapeia usuario_id -> quantidade de conexões (sockets) abertas, permitindo
# que um usuário com múltiplas abas continue "online" enquanto pelo menos
# uma conexão estiver ativa.
usuarios_conectados = {}


def registrar_eventos(socketio):

    @socketio.on("connect")
    def ao_conectar():
        usuario_id = session.get("usuario_id")
        if not usuario_id:
            return False  # rejeita conexões não autenticadas

        usuarios_conectados[usuario_id] = usuarios_conectados.get(usuario_id, 0) + 1
        UserModel.atualizar_status_online(usuario_id, True)

        # Entra automaticamente em uma "sala pessoal" para notificações diretas
        join_room(f"usuario_{usuario_id}")

        emit(
            "usuario_status",
            {"usuario_id": usuario_id, "online": True},
            broadcast=True,
        )

    @socketio.on("disconnect")
    def ao_desconectar():
        usuario_id = session.get("usuario_id")
        if not usuario_id:
            return

        usuarios_conectados[usuario_id] = max(0, usuarios_conectados.get(usuario_id, 1) - 1)

        if usuarios_conectados[usuario_id] == 0:
            UserModel.atualizar_status_online(usuario_id, False)
            emit(
                "usuario_status",
                {"usuario_id": usuario_id, "online": False},
                broadcast=True,
            )

    # ------------------------------------------------------------------
    # Entrar / sair de salas (rooms do Socket.IO)
    # ------------------------------------------------------------------
    @socketio.on("entrar_sala")
    def ao_entrar_sala(dados):
        usuario_id = session.get("usuario_id")
        sala_id = dados.get("sala_id")
        if not usuario_id or not sala_id:
            return

        if not RoomModel.usuario_participa(sala_id, usuario_id):
            emit("erro", {"mensagem": "Você não participa desta sala."})
            return

        join_room(f"sala_{sala_id}")
        RoomModel.marcar_como_lida(sala_id, usuario_id)

    @socketio.on("sair_sala")
    def ao_sair_sala(dados):
        sala_id = dados.get("sala_id")
        if sala_id:
            leave_room(f"sala_{sala_id}")

    # ------------------------------------------------------------------
    # Envio de mensagens
    # ------------------------------------------------------------------
    @socketio.on("enviar_mensagem")
    def ao_enviar_mensagem(dados):
        usuario_id = session.get("usuario_id")
        sala_id = dados.get("sala_id")
        conteudo = (dados.get("conteudo") or "").strip()
        tipo = dados.get("tipo", "texto")
        imagem_url = dados.get("imagem_url")

        if not usuario_id or not sala_id:
            emit("erro", {"mensagem": "Requisição inválida."})
            return

        if not RoomModel.usuario_participa(sala_id, usuario_id):
            emit("erro", {"mensagem": "Você não participa desta sala."})
            return

        if tipo == "texto" and not conteudo:
            return
        if tipo == "imagem" and not imagem_url:
            return

        # Bloqueio: impede envio em conversas privadas com usuário bloqueado
        sala = RoomModel.buscar_por_id(sala_id)
        if sala and sala["tipo"] == "privada":
            participantes = RoomModel.listar_participantes(sala_id)
            outro = next((p for p in participantes if p["id"] != usuario_id), None)
            if outro and UserModel.esta_bloqueado(usuario_id, outro["id"]):
                emit("erro", {"mensagem": "Não é possível enviar mensagens para este usuário."})
                return

        mensagem_id = MessageModel.criar_mensagem(
            sala_id=sala_id,
            remetente_id=usuario_id,
            conteudo=conteudo if tipo != "imagem" else None,
            tipo=tipo,
            imagem_url=imagem_url,
        )
        mensagem = MessageModel.buscar_por_id(mensagem_id)
        mensagem["enviado_em"] = mensagem["enviado_em"].isoformat()

        # Envia a mensagem para todos na sala (incluindo o remetente)
        emit("nova_mensagem", mensagem, room=f"sala_{sala_id}")

        # Notifica individualmente cada participante (exceto o remetente) para
        # que sua lista de conversas e contador de não lidas seja atualizado,
        # mesmo que não estejam com a sala aberta no momento.
        participantes = RoomModel.listar_participantes(sala_id)
        for p in participantes:
            if p["id"] != usuario_id:
                emit(
                    "notificacao_mensagem",
                    {
                        "sala_id": sala_id,
                        "mensagem": mensagem,
                    },
                    room=f"usuario_{p['id']}",
                )

    # ------------------------------------------------------------------
    # Indicador de "digitando..."
    # ------------------------------------------------------------------
    @socketio.on("digitando")
    def ao_digitar(dados):
        usuario_id = session.get("usuario_id")
        sala_id = dados.get("sala_id")
        if not usuario_id or not sala_id:
            return
        nome_usuario = session.get("nome_usuario", "Alguém")
        emit(
            "usuario_digitando",
            {"usuario_id": usuario_id, "nome_usuario": nome_usuario, "sala_id": sala_id},
            room=f"sala_{sala_id}",
            include_self=False,
        )

    @socketio.on("parou_digitar")
    def ao_parar_digitar(dados):
        usuario_id = session.get("usuario_id")
        sala_id = dados.get("sala_id")
        if not usuario_id or not sala_id:
            return
        emit(
            "usuario_parou_digitar",
            {"usuario_id": usuario_id, "sala_id": sala_id},
            room=f"sala_{sala_id}",
            include_self=False,
        )

    # ------------------------------------------------------------------
    # Marcar mensagens como lidas (ao abrir a sala)
    # ------------------------------------------------------------------
    @socketio.on("marcar_lida")
    def ao_marcar_lida(dados):
        usuario_id = session.get("usuario_id")
        sala_id = dados.get("sala_id")
        if not usuario_id or not sala_id:
            return
        RoomModel.marcar_como_lida(sala_id, usuario_id)
