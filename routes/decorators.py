"""
routes/decorators.py
----------------------
Decorators utilitários usados nas rotas, como controle de acesso
(exigir usuário autenticado).
"""

from functools import wraps
from flask import session, redirect, url_for, flash, jsonify, request


def login_required(f):
    """Garante que o usuário esteja autenticado antes de acessar a rota.
    Se a requisição for JSON/AJAX, retorna 401 em vez de redirecionar."""

    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("usuario_id"):
            if request.is_json or request.path.startswith("/api"):
                return jsonify({"erro": "Não autenticado"}), 401
            flash("Faça login para continuar.", "error")
            return redirect(url_for("auth.login"))
        return f(*args, **kwargs)

    return decorated
