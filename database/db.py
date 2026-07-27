"""
database/db.py
--------------
Camada de acesso ao banco de dados MySQL.

Responsabilidades:
- Criar conexões (pool simples) com o MySQL usando mysql-connector-python.
- Criar automaticamente o banco de dados e todas as tabelas na inicialização
  da aplicação, caso ainda não existam.
- Fornecer função utilitária `get_db()` para ser usada pelas rotas/models.
"""

import mysql.connector
from mysql.connector import pooling

_pool = None


def init_pool(app):
    """Cria o pool de conexões e garante que o banco/tabelas existam."""
    global _pool

    cfg = app.config

    # 1) Conecta sem especificar o banco para poder criá-lo caso não exista
    conn = mysql.connector.connect(
        host=cfg["MYSQL_HOST"],
        port=cfg["MYSQL_PORT"],
        user=cfg["MYSQL_USER"],
        password=cfg["MYSQL_PASSWORD"],
    )
    cursor = conn.cursor()
    cursor.execute(
        f"CREATE DATABASE IF NOT EXISTS `{cfg['MYSQL_DB']}` "
        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    )
    conn.commit()
    cursor.close()
    conn.close()

    # 2) Cria o pool já apontando para o banco correto
    _pool = pooling.MySQLConnectionPool(
        pool_name="chatapp_pool",
        pool_size=10,
        host=cfg["MYSQL_HOST"],
        port=cfg["MYSQL_PORT"],
        user=cfg["MYSQL_USER"],
        password=cfg["MYSQL_PASSWORD"],
        database=cfg["MYSQL_DB"],
        autocommit=False,
    )

    # 3) Garante a criação das tabelas
    create_tables()


def get_db():
    """Retorna uma conexão do pool. Quem chamar deve fechar (conn.close())."""
    global _pool
    return _pool.get_connection()


def create_tables():
    """Cria todas as tabelas do sistema caso não existam."""
    conn = get_db()
    cursor = conn.cursor()

    # ------------------------------------------------------------------
    # Tabela: usuarios
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome_usuario VARCHAR(50) NOT NULL UNIQUE,
            email VARCHAR(120) NOT NULL UNIQUE,
            senha_hash VARCHAR(255) NOT NULL,
            foto_perfil VARCHAR(255) DEFAULT 'default.png',
            bio VARCHAR(255) DEFAULT '',
            status_online BOOLEAN DEFAULT FALSE,
            ultima_conexao DATETIME DEFAULT CURRENT_TIMESTAMP,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
    )

    # ------------------------------------------------------------------
    # Tabela: salas (chat rooms - podem ser privadas 1:1 ou em grupo)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS salas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            descricao VARCHAR(255) DEFAULT '',
            tipo ENUM('privada', 'grupo') NOT NULL DEFAULT 'grupo',
            criador_id INT NOT NULL,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (criador_id) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
    )

    # ------------------------------------------------------------------
    # Tabela: participantes (usuários dentro de uma sala - N:N)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS participantes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sala_id INT NOT NULL,
            usuario_id INT NOT NULL,
            entrou_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            ultima_leitura DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_sala_usuario (sala_id, usuario_id),
            FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE CASCADE,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
    )

    # ------------------------------------------------------------------
    # Tabela: mensagens
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS mensagens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sala_id INT NOT NULL,
            remetente_id INT NOT NULL,
            conteudo TEXT,
            tipo ENUM('texto', 'imagem', 'emoji') NOT NULL DEFAULT 'texto',
            imagem_url VARCHAR(255) DEFAULT NULL,
            enviado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE CASCADE,
            FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            FULLTEXT KEY ft_conteudo (conteudo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
    )

    # ------------------------------------------------------------------
    # Tabela: amizades (relação de contatos/conversas diretas)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS amizades (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            amigo_id INT NOT NULL,
            status ENUM('pendente', 'aceito', 'recusado') NOT NULL DEFAULT 'aceito',
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_par (usuario_id, amigo_id),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            FOREIGN KEY (amigo_id) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
    )

    # ------------------------------------------------------------------
    # Tabela: bloqueados
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS bloqueados (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            bloqueado_id INT NOT NULL,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_bloqueio (usuario_id, bloqueado_id),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            FOREIGN KEY (bloqueado_id) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
    )

    # ------------------------------------------------------------------
    # Tabela: denuncias (bônus - sistema de denúncia de usuários)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS denuncias (
            id INT AUTO_INCREMENT PRIMARY KEY,
            denunciante_id INT NOT NULL,
            denunciado_id INT NOT NULL,
            motivo VARCHAR(255) NOT NULL,
            detalhes TEXT,
            status ENUM('pendente', 'analisado') NOT NULL DEFAULT 'pendente',
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (denunciante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            FOREIGN KEY (denunciado_id) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
    )

    conn.commit()
    cursor.close()
    conn.close()
