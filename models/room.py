"""
models/room.py
---------------
Model responsável pelas salas de chat (grupos e conversas privadas) e
pelo gerenciamento de participantes.
"""

from database.db import get_db


class RoomModel:

    # ------------------------------------------------------------------
    # Criação de salas
    # ------------------------------------------------------------------
    @staticmethod
    def criar_sala(nome, descricao, tipo, criador_id, membros_ids=None):
        """Cria uma sala e já adiciona o criador (e opcionalmente outros membros)."""
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO salas (nome, descricao, tipo, criador_id)
                   VALUES (%s, %s, %s, %s)""",
                (nome, descricao, tipo, criador_id),
            )
            sala_id = cursor.lastrowid

            membros = set(membros_ids or [])
            membros.add(criador_id)
            for membro_id in membros:
                cursor.execute(
                    """INSERT IGNORE INTO participantes (sala_id, usuario_id)
                       VALUES (%s, %s)""",
                    (sala_id, membro_id),
                )
            conn.commit()
            return sala_id
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def buscar_ou_criar_privada(usuario_id, outro_id):
        """Busca uma sala privada 1:1 já existente entre dois usuários,
        ou cria uma nova caso não exista."""
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                """SELECT s.id FROM salas s
                   JOIN participantes p1 ON p1.sala_id = s.id AND p1.usuario_id = %s
                   JOIN participantes p2 ON p2.sala_id = s.id AND p2.usuario_id = %s
                   WHERE s.tipo = 'privada'
                   LIMIT 1""",
                (usuario_id, outro_id),
            )
            existente = cursor.fetchone()
            if existente:
                return existente["id"]
        finally:
            cursor.close()
            conn.close()

        return RoomModel.criar_sala(
            nome="Conversa privada",
            descricao="",
            tipo="privada",
            criador_id=usuario_id,
            membros_ids=[outro_id],
        )

    # ------------------------------------------------------------------
    # Consultas
    # ------------------------------------------------------------------
    @staticmethod
    def buscar_por_id(sala_id):
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM salas WHERE id = %s", (sala_id,))
            return cursor.fetchone()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def listar_salas_do_usuario(usuario_id):
        """Lista as conversas do usuário com última mensagem e contagem de
        não lidas — usado para montar a lista de conversas na sidebar."""
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                """
                SELECT
                    s.id AS sala_id,
                    s.nome,
                    s.tipo,
                    p.ultima_leitura,
                    (SELECT conteudo FROM mensagens m
                        WHERE m.sala_id = s.id ORDER BY m.enviado_em DESC LIMIT 1) AS ultima_mensagem,
                    (SELECT tipo FROM mensagens m
                        WHERE m.sala_id = s.id ORDER BY m.enviado_em DESC LIMIT 1) AS ultima_mensagem_tipo,
                    (SELECT enviado_em FROM mensagens m
                        WHERE m.sala_id = s.id ORDER BY m.enviado_em DESC LIMIT 1) AS ultima_mensagem_hora,
                    (SELECT COUNT(*) FROM mensagens m
                        WHERE m.sala_id = s.id AND m.enviado_em > p.ultima_leitura
                              AND m.remetente_id != %s) AS nao_lidas
                FROM salas s
                JOIN participantes p ON p.sala_id = s.id
                WHERE p.usuario_id = %s
                ORDER BY ultima_mensagem_hora DESC
                """,
                (usuario_id, usuario_id),
            )
            salas = cursor.fetchall()

            # Para salas privadas, busca o "outro" usuário para exibir nome/foto
            for sala in salas:
                if sala["tipo"] == "privada":
                    cursor.execute(
                        """SELECT u.id, u.nome_usuario, u.foto_perfil, u.status_online
                           FROM participantes p
                           JOIN usuarios u ON u.id = p.usuario_id
                           WHERE p.sala_id = %s AND p.usuario_id != %s
                           LIMIT 1""",
                        (sala["sala_id"], usuario_id),
                    )
                    outro = cursor.fetchone()
                    if outro:
                        sala["nome_exibicao"] = outro["nome_usuario"]
                        sala["foto_exibicao"] = outro["foto_perfil"]
                        sala["outro_usuario_id"] = outro["id"]
                        sala["outro_status_online"] = outro["status_online"]
                else:
                    sala["nome_exibicao"] = sala["nome"]
                    sala["foto_exibicao"] = None
            return salas
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def listar_participantes(sala_id):
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                """SELECT u.id, u.nome_usuario, u.foto_perfil, u.status_online
                   FROM participantes p
                   JOIN usuarios u ON u.id = p.usuario_id
                   WHERE p.sala_id = %s""",
                (sala_id,),
            )
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def usuario_participa(sala_id, usuario_id):
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT id FROM participantes WHERE sala_id = %s AND usuario_id = %s",
                (sala_id, usuario_id),
            )
            return cursor.fetchone() is not None
        finally:
            cursor.close()
            conn.close()

    # ------------------------------------------------------------------
    # Entrar / Sair
    # ------------------------------------------------------------------
    @staticmethod
    def entrar_na_sala(sala_id, usuario_id):
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT IGNORE INTO participantes (sala_id, usuario_id)
                   VALUES (%s, %s)""",
                (sala_id, usuario_id),
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def sair_da_sala(sala_id, usuario_id):
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "DELETE FROM participantes WHERE sala_id = %s AND usuario_id = %s",
                (sala_id, usuario_id),
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def marcar_como_lida(sala_id, usuario_id):
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """UPDATE participantes SET ultima_leitura = NOW()
                   WHERE sala_id = %s AND usuario_id = %s""",
                (sala_id, usuario_id),
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def salas_publicas_disponiveis(usuario_id):
        """Lista salas em grupo que o usuário ainda não participa (para poder entrar)."""
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                """SELECT s.id, s.nome, s.descricao
                   FROM salas s
                   WHERE s.tipo = 'grupo'
                     AND s.id NOT IN (
                         SELECT sala_id FROM participantes WHERE usuario_id = %s
                     )""",
                (usuario_id,),
            )
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()
