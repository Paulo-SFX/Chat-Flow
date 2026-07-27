"""
models/user.py
---------------
Model responsável por todas as operações relacionadas à tabela `usuarios`:
cadastro, autenticação, busca, atualização de perfil, status online, etc.
"""

from werkzeug.security import generate_password_hash, check_password_hash
from database.db import get_db


class UserModel:

    # ------------------------------------------------------------------
    # Criação / Cadastro
    # ------------------------------------------------------------------
    @staticmethod
    def criar_usuario(nome_usuario, email, senha):
        """Cria um novo usuário com senha criptografada (hash)."""
        senha_hash = generate_password_hash(senha)
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO usuarios (nome_usuario, email, senha_hash)
                   VALUES (%s, %s, %s)""",
                (nome_usuario, email, senha_hash),
            )
            conn.commit()
            return cursor.lastrowid
        finally:
            cursor.close()
            conn.close()

    # ------------------------------------------------------------------
    # Consultas
    # ------------------------------------------------------------------
    @staticmethod
    def buscar_por_email(email):
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM usuarios WHERE email = %s", (email,))
            return cursor.fetchone()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def buscar_por_nome_usuario(nome_usuario):
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT * FROM usuarios WHERE nome_usuario = %s", (nome_usuario,)
            )
            return cursor.fetchone()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def buscar_por_id(usuario_id):
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM usuarios WHERE id = %s", (usuario_id,))
            return cursor.fetchone()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def pesquisar_usuarios(termo, usuario_atual_id):
        """Pesquisa usuários por nome (exceto o próprio usuário logado)."""
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                """SELECT id, nome_usuario, foto_perfil, status_online
                   FROM usuarios
                   WHERE nome_usuario LIKE %s AND id != %s
                   LIMIT 20""",
                (f"%{termo}%", usuario_atual_id),
            )
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def listar_online():
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                """SELECT id, nome_usuario, foto_perfil
                   FROM usuarios WHERE status_online = TRUE"""
            )
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

    # ------------------------------------------------------------------
    # Autenticação
    # ------------------------------------------------------------------
    @staticmethod
    def verificar_senha(senha_hash, senha_informada):
        return check_password_hash(senha_hash, senha_informada)

    # ------------------------------------------------------------------
    # Atualizações de perfil / configurações
    # ------------------------------------------------------------------
    @staticmethod
    def atualizar_status_online(usuario_id, online: bool):
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """UPDATE usuarios SET status_online = %s, ultima_conexao = NOW()
                   WHERE id = %s""",
                (online, usuario_id),
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def atualizar_foto_perfil(usuario_id, filename):
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE usuarios SET foto_perfil = %s WHERE id = %s",
                (filename, usuario_id),
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def atualizar_nome_usuario(usuario_id, novo_nome):
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE usuarios SET nome_usuario = %s WHERE id = %s",
                (novo_nome, usuario_id),
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def atualizar_senha(usuario_id, nova_senha):
        senha_hash = generate_password_hash(nova_senha)
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE usuarios SET senha_hash = %s WHERE id = %s",
                (senha_hash, usuario_id),
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def atualizar_bio(usuario_id, bio):
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute("UPDATE usuarios SET bio = %s WHERE id = %s", (bio, usuario_id))
            conn.commit()
        finally:
            cursor.close()
            conn.close()

    # ------------------------------------------------------------------
    # Bloqueios e denúncias
    # ------------------------------------------------------------------
    @staticmethod
    def bloquear_usuario(usuario_id, bloqueado_id):
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT IGNORE INTO bloqueados (usuario_id, bloqueado_id)
                   VALUES (%s, %s)""",
                (usuario_id, bloqueado_id),
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def desbloquear_usuario(usuario_id, bloqueado_id):
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "DELETE FROM bloqueados WHERE usuario_id = %s AND bloqueado_id = %s",
                (usuario_id, bloqueado_id),
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def listar_bloqueados(usuario_id):
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                """SELECT u.id, u.nome_usuario, u.foto_perfil
                   FROM bloqueados b
                   JOIN usuarios u ON u.id = b.bloqueado_id
                   WHERE b.usuario_id = %s""",
                (usuario_id,),
            )
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def esta_bloqueado(usuario_id, outro_id):
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                """SELECT id FROM bloqueados
                   WHERE (usuario_id = %s AND bloqueado_id = %s)
                      OR (usuario_id = %s AND bloqueado_id = %s)""",
                (usuario_id, outro_id, outro_id, usuario_id),
            )
            return cursor.fetchone() is not None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def denunciar_usuario(denunciante_id, denunciado_id, motivo, detalhes):
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO denuncias (denunciante_id, denunciado_id, motivo, detalhes)
                   VALUES (%s, %s, %s, %s)""",
                (denunciante_id, denunciado_id, motivo, detalhes),
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()
