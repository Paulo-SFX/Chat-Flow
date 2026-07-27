# 💬 ChatFlow — Chat em Tempo Real com Flask e Socket.IO

Aplicação web de chat em tempo real construída como projeto de portfólio, demonstrando
autenticação segura, comunicação em tempo real com WebSockets, persistência em MySQL
e uma interface moderna inspirada em Discord/WhatsApp/Slack.

![Status](https://img.shields.io/badge/status-completo-brightgreen)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![Flask](https://img.shields.io/badge/Flask-3.x-black)
![MySQL](https://img.shields.io/badge/MySQL-8.x-orange)

---

## 📖 Descrição

O **ChatFlow** é um sistema de chat multiusuário em tempo real. Usuários podem se
cadastrar, criar salas de grupo ou iniciar conversas privadas, trocar mensagens de
texto, emojis e imagens instantaneamente, ver quem está online e quem está digitando,
gerenciar seu perfil e se proteger bloqueando ou denunciando outros usuários.

O projeto foi desenvolvido com foco em **boas práticas**: separação de responsabilidades
(models / routes / sockets / templates), senhas protegidas com hash, validações de
formulário no back-end, e uma arquitetura fácil de entender e expandir.

---

## 🚀 Tecnologias utilizadas

| Camada         | Tecnologia                                   |
|----------------|-----------------------------------------------|
| Back-end       | Python 3, Flask, Flask-SocketIO                |
| Tempo real     | WebSockets via Socket.IO (modo threading)      |
| Banco de dados | MySQL 8 (mysql-connector-python)               |
| Autenticação   | Sessões Flask + Werkzeug `generate_password_hash` |
| Front-end      | HTML5, CSS3 (Grid/Flexbox), JavaScript puro (ES6+) |
| Ícones         | Font Awesome 6                                 |
| Tipografia     | Google Fonts — Inter                           |

---

## 📂 Estrutura de pastas

```
chatapp/
├── app.py                     # Ponto de entrada da aplicação (Flask + SocketIO)
├── config.py                  # Configurações centrais (MySQL, uploads, sessão)
├── requirements.txt           # Dependências Python
├── .env.example                # Exemplo de variáveis de ambiente
├── README.md
│
├── database/
│   ├── db.py                  # Conexão MySQL + criação automática das tabelas
│   └── schema.sql              # Schema de referência (documentação)
│
├── models/
│   ├── user.py                # Cadastro, login, perfil, bloqueios
│   ├── room.py                # Salas de chat e participantes
│   └── message.py              # Mensagens e histórico
│
├── routes/
│   ├── decorators.py           # @login_required
│   ├── auth.py                 # Cadastro / login / logout
│   ├── chat.py                 # Tela principal, histórico, pesquisas
│   ├── rooms.py                 # Criar/entrar/sair de salas
│   ├── users.py                 # Bloquear / denunciar / perfil
│   ├── upload.py                 # Upload de avatar e imagens do chat
│   └── settings.py               # Configurações de conta
│
├── sockets/
│   └── events.py                # Eventos Flask-SocketIO (mensagens, digitando, status)
│
├── templates/
│   ├── base.html
│   ├── login.html
│   ├── register.html
│   ├── chat.html                # Interface principal (3 colunas)
│   ├── settings.html
│   └── profile.html
│
├── static/
│   ├── css/
│   │   ├── variables.css        # Paleta de cores (tema claro/escuro)
│   │   └── style.css            # Layout, componentes, responsividade
│   ├── js/
│   │   ├── theme.js              # Alternância de tema
│   │   ├── auth.js                # Login/registro
│   │   ├── socket.js              # Wrapper do Socket.IO
│   │   ├── chat.js                # Lógica principal do chat
│   │   ├── ui.js                   # Modais, emojis, dropdowns
│   │   ├── emoji.js                 # Lista de emojis
│   │   ├── settings.js               # Página de configurações
│   │   └── profile.js                # Página de perfil
│   └── images/
│       └── default_avatar.png
│
└── uploads/
    ├── avatars/                # Fotos de perfil enviadas pelos usuários
    └── chat_images/             # Imagens enviadas no chat
```

---

## ✅ Funcionalidades

### Autenticação e conta
- [x] Cadastro de usuários com validação de campos
- [x] Login e logout com sessão persistente
- [x] Senhas protegidas com `werkzeug.security.generate_password_hash`
- [x] Alteração de nome de usuário, senha, bio e foto de perfil

### Chat em tempo real
- [x] Envio e recebimento de mensagens instantâneas via Flask-SocketIO
- [x] Histórico de mensagens persistido no MySQL
- [x] Indicador de "usuário está digitando..."
- [x] Horário de envio em cada mensagem
- [x] Envio de emojis
- [x] Upload e envio de imagens no chat
- [x] Balões de mensagem estilo WhatsApp/Discord (mensagens próprias à direita)

### Salas e conversas
- [x] Criação de salas em grupo
- [x] Entrar / sair de salas
- [x] Conversas privadas (1:1) criadas automaticamente
- [x] Lista de conversas com última mensagem, horário e não lidas
- [x] Contador de mensagens não lidas por conversa

### Social
- [x] Lista de usuários online em tempo real
- [x] Pesquisa de usuários
- [x] Pesquisa de mensagens (na conversa atual ou em todas)
- [x] Bloquear / desbloquear usuários
- [x] Denunciar usuários
- [x] Página de perfil pública

### Interface
- [x] Layout em 3 colunas (sidebar, conversas, chat) inspirado em Discord
- [x] Totalmente responsivo (desktop, tablet, celular)
- [x] Tema claro e escuro com persistência local
- [x] Notificações flutuantes de novas mensagens
- [x] Animações suaves (fade in, slide up, hover, digitando)

---

## 🛠️ Instalação

### Pré-requisitos
- Python 3.10+
- MySQL Server 8.x rodando localmente (ou remoto)
- pip

### 1. Clonar / extrair o projeto
```bash
cd chatapp
```

### 2. Criar e ativar um ambiente virtual (recomendado)
```bash
python3 -m venv venv

# Linux/Mac
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 3. Instalar as dependências
```bash
pip install -r requirements.txt
```

---

## 🗄️ Configuração do MySQL

1. Certifique-se de que o serviço do MySQL está rodando.
2. Você **não precisa criar o banco manualmente** — a aplicação cria automaticamente
   o banco de dados e todas as tabelas na primeira execução (veja `database/db.py`).
3. Copie o arquivo de variáveis de ambiente de exemplo:

```bash
cp .env.example .env
```

4. Edite o arquivo `.env` com as credenciais do seu MySQL:

```env
SECRET_KEY=uma-chave-secreta-bem-forte
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=sua_senha_mysql
MYSQL_DB=chat_app
```

5. Pronto — o `config.py` já carrega o arquivo `.env` automaticamente através do
   `python-dotenv` (`load_dotenv()`), então não é preciso exportar as variáveis
   manualmente no terminal.

---

## ▶️ Como executar

```bash
python app.py
```

A aplicação estará disponível em:

```
http://localhost:5000
```

Ao acessar pela primeira vez, você será redirecionado para a tela de **login**.
Clique em **"Cadastre-se"** para criar sua primeira conta.

Para testar o chat em tempo real, abra a aplicação em duas abas (ou navegadores)
diferentes, logado com dois usuários distintos, e inicie uma conversa.

---

## 🗃️ Tabelas do banco de dados

| Tabela         | Descrição                                                   |
|----------------|--------------------------------------------------------------|
| `usuarios`     | Dados de conta: nome, e-mail, senha (hash), foto, status     |
| `salas`        | Salas de chat (grupo ou conversa privada)                    |
| `participantes`| Relação N:N entre usuários e salas                           |
| `mensagens`    | Histórico de mensagens (texto, imagem ou emoji)              |
| `amizades`     | Relação de contatos entre usuários                            |
| `bloqueados`   | Usuários bloqueados por outros usuários                       |
| `denuncias`    | Denúncias registradas contra usuários                          |

Todas as tabelas possuem chave primária própria e chaves estrangeiras com
`ON DELETE CASCADE`, garantindo integridade referencial.

---

## 🖼️ Imagens do projeto

> As capturas de tela abaixo são apenas placeholders. Após rodar o projeto
> localmente, tire prints das telas de login, chat e configurações e
> substitua os caminhos abaixo (ex.: salvando em `static/images/screenshots/`).

```
static/images/screenshots/login.png
static/images/screenshots/chat.png
static/images/screenshots/settings.png
```

```markdown
![Tela de login](static/images/screenshots/login.png)
![Tela de chat](static/images/screenshots/chat.png)
![Tela de configurações](static/images/screenshots/settings.png)
```

## 🎨 Design

- **Paleta de cores** (tema escuro): fundo `#0f172a`, painéis `#1e293b`, chat `#111827`,
  cor primária `#3b82f6`, destaque `#22c55e`.
- **Tema claro** disponível com alternância instantânea, salva em `localStorage`.
- Layout construído com **CSS Grid** (colunas principais) e **Flexbox** (componentes
  internos), com bordas arredondadas de 12px, sombras suaves e transições de 0.3s.

---

## 🔒 Segurança

- Senhas nunca são armazenadas em texto puro — apenas hashes gerados com
  `werkzeug.security.generate_password_hash`.
- Todas as rotas sensíveis exigem sessão autenticada (`@login_required`).
- Uploads validam extensão e tamanho máximo de arquivo (8MB).
- Conexões Socket.IO não autenticadas são rejeitadas.
- Envio de mensagens é bloqueado entre usuários que se bloquearam mutuamente.

---

## 📌 Possíveis melhorias futuras

- Reações a mensagens (👍 ❤️ 😂)
- Mensagens de voz
- Notificações push do navegador
- Painel administrativo para revisar denúncias
- Testes automatizados (pytest)

---

## 👨‍💻 Autor

Projeto desenvolvido como portfólio para demonstrar conhecimentos em **Flask**,
**Socket.IO**, **MySQL**, autenticação, modelagem de banco de dados e
desenvolvimento web full-stack.
