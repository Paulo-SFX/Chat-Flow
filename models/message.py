"""
models/message.py
------------------
Model responsável pelo histórico de mensagens: envio, listagem e pesquisa.
"""

from database.db import get_db


class MessageModel:

    @staticmethod
    def criar_mensagem(sala_id, remetente_id, conteudo=None, tipo="texto", imagem_url=None):
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO mensagens (sala_id, remetente_id, conteudo, tipo, imagem_url)
                   VALUES (%s, %s, %s, %s, %s)""",
                (sala_id, remetente_id, conteudo, tipo, imagem_url),
            )
            conn.commit()
            return cursor.lastrowid
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def buscar_por_id(mensagem_id):
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                """SELECT m.*, u.nome_usuario, u.foto_perfil
                   FROM mensagens m
                   JOIN usuarios u ON u.id = m.remetente_id
                   WHERE m.id = %s""",
                (mensagem_id,),
            )
            return cursor.fetchone()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def listar_historico(sala_id, limite=50, antes_de_id=None):
        """Lista o histórico de mensagens de uma sala (mais recentes primeiro,
        com suporte a paginação por `antes_de_id` para scroll infinito)."""
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            if antes_de_id:
                cursor.execute(
                    """SELECT m.*, u.nome_usuario, u.foto_perfil
                       FROM mensagens m
                       JOIN usuarios u ON u.id = m.remetente_id
                       WHERE m.sala_id = %s AND m.id < %s
                       ORDER BY m.enviado_em DESC
                       LIMIT %s""",
                    (sala_id, antes_de_id, limite),
                )
            else:
                cursor.execute(
                    """SELECT m.*, u.nome_usuario, u.foto_perfil
                       FROM mensagens m
                       JOIN usuarios u ON u.id = m.remetente_id
                       WHERE m.sala_id = %s
                       ORDER BY m.enviado_em DESC
                       LIMIT %s""",
                    (sala_id, limite),
                )
            resultado = cursor.fetchall()
            resultado.reverse()  # devolve em ordem cronológica
            return resultado
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def pesquisar_mensagens(sala_id, termo):
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                """SELECT m.*, u.nome_usuario, u.foto_perfil
                   FROM mensagens m
                   JOIN usuarios u ON u.id = m.remetente_id
                   WHERE m.sala_id = %s AND m.conteudo LIKE %s
                   ORDER BY m.enviado_em DESC
                   LIMIT 50""",
                (sala_id, f"%{termo}%"),
            )
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def pesquisar_mensagens_usuario(usuario_id, termo):
        """Pesquisa mensagens em todas as salas onde o usuário participa."""
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                """SELECT m.*, u.nome_usuario, u.foto_perfil, s.nome AS sala_nome
                   FROM mensagens m
                   JOIN usuarios u ON u.id = m.remetente_id
                   JOIN participantes p ON p.sala_id = m.sala_id AND p.usuario_id = %s
                   JOIN salas s ON s.id = m.sala_id
                   WHERE m.conteudo LIKE %s
                   ORDER BY m.enviado_em DESC
                   LIMIT 50""",
                (usuario_id, f"%{termo}%"),
            )
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def contar_nao_lidas(sala_id, usuario_id, ultima_leitura):
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                """SELECT COUNT(*) AS total FROM mensagens
                   WHERE sala_id = %s AND enviado_em > %s AND remetente_id != %s""",
                (sala_id, ultima_leitura, usuario_id),
            )
            return cursor.fetchone()["total"]
        finally:
            cursor.close()
            conn.close()
