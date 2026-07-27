"""
routes/auth.py
----------------
Rotas responsáveis pela autenticação de usuários:
- Cadastro (com validações e senha protegida via hash)
- Login (com criação de sessão)
- Logout (encerramento de sessão e atualização de status online)
"""

import re
from flask import Blueprint, render_template, request, redirect, url_for, session, flash

from models.user import UserModel

auth_bp = Blueprint("auth", __name__)

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def usuario_logado():
    return session.get("usuario_id") is not None


@auth_bp.route("/registro", methods=["GET", "POST"])
def registro():
    if usuario_logado():
        return redirect(url_for("chat.index"))

    if request.method == "POST":
        nome_usuario = request.form.get("nome_usuario", "").strip()
        email = request.form.get("email", "").strip().lower()
        senha = request.form.get("senha", "")
        confirmar_senha = request.form.get("confirmar_senha", "")

        erros = []

        # --- Validações ---
        if len(nome_usuario) < 3 or len(nome_usuario) > 30:
            erros.append("O nome de usuário deve ter entre 3 e 30 caracteres.")
        if not re.match(r"^[a-zA-Z0-9_.]+$", nome_usuario or ""):
            erros.append("O nome de usuário deve conter apenas letras, números, '_' ou '.'")
        if not EMAIL_REGEX.match(email or ""):
            erros.append("Informe um e-mail válido.")
        if len(senha) < 6:
            erros.append("A senha deve ter pelo menos 6 caracteres.")
        if senha != confirmar_senha:
            erros.append("As senhas não coincidem.")

        if not erros:
            if UserModel.buscar_por_email(email):
                erros.append("Este e-mail já está cadastrado.")
            if UserModel.buscar_por_nome_usuario(nome_usuario):
                erros.append("Este nome de usuário já está em uso.")

        if erros:
            for erro in erros:
                flash(erro, "error")
            return render_template(
                "register.html", nome_usuario=nome_usuario, email=email
            )

        usuario_id = UserModel.criar_usuario(nome_usuario, email, senha)
        session.permanent = True
        session["usuario_id"] = usuario_id
        session["nome_usuario"] = nome_usuario
        flash("Conta criada com sucesso! Bem-vindo(a).", "success")
        return redirect(url_for("chat.index"))

    return render_template("register.html")


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if usuario_logado():
        return redirect(url_for("chat.index"))

    if request.method == "POST":
        identificador = request.form.get("identificador", "").strip().lower()
        senha = request.form.get("senha", "")

        if not identificador or not senha:
            flash("Preencha todos os campos.", "error")
            return render_template("login.html")

        usuario = UserModel.buscar_por_email(identificador)
        if not usuario:
            usuario = UserModel.buscar_por_nome_usuario(identificador)

        if not usuario or not UserModel.verificar_senha(usuario["senha_hash"], senha):
            flash("Usuário/e-mail ou senha incorretos.", "error")
            return render_template("login.html")

        session.permanent = True
        session["usuario_id"] = usuario["id"]
        session["nome_usuario"] = usuario["nome_usuario"]
        UserModel.atualizar_status_online(usuario["id"], True)
        flash(f"Bem-vindo(a) de volta, {usuario['nome_usuario']}!", "success")
        return redirect(url_for("chat.index"))

    return render_template("login.html")


@auth_bp.route("/logout")
def logout():
    usuario_id = session.get("usuario_id")
    if usuario_id:
        UserModel.atualizar_status_online(usuario_id, False)
    session.clear()
    flash("Você saiu da sua conta.", "success")
    return redirect(url_for("auth.login"))
