-- =====================================================================
-- schema.sql
-- ----------------------------------------------------------------------
-- Este arquivo é apenas uma REFERÊNCIA/documentação do schema.
-- As tabelas são criadas automaticamente pela aplicação em
-- database/db.py (função create_tables) na primeira execução.
-- Você não precisa rodar este script manualmente, mas pode usá-lo
-- para inspecionar a estrutura ou recriar o banco manualmente.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS chat_app
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE chat_app;

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

CREATE TABLE IF NOT EXISTS salas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255) DEFAULT '',
    tipo ENUM('privada', 'grupo') NOT NULL DEFAULT 'grupo',
    criador_id INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (criador_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CREATE TABLE IF NOT EXISTS bloqueados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    bloqueado_id INT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_bloqueio (usuario_id, bloqueado_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (bloqueado_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
