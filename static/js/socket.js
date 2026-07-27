/**
 * socket.js
 * ----------
 * Encapsula a conexão Flask-SocketIO no frontend e expõe um objeto
 * global `ChatFlowSocket` com os métodos usados por chat.js e ui.js.
 *
 * Eventos ouvidos do servidor:
 *  - usuario_status        -> atualização de status online/offline
 *  - nova_mensagem         -> nova mensagem recebida na sala aberta
 *  - notificacao_mensagem  -> notificação para qualquer sala do usuário
 *  - usuario_digitando     -> alguém está digitando
 *  - usuario_parou_digitar -> alguém parou de digitar
 *  - erro                  -> erro genérico vindo do servidor
 */

(function () {
    // Abre a conexão WebSocket com o servidor. `polling` é mantido como
    // fallback caso o navegador/rede não suporte WebSocket nativo.
    const socket = io({ transports: ["websocket", "polling"] });

    // Cada chave guarda uma lista de funções "callback" que serão chamadas
    // quando o evento correspondente chegar do servidor. Isso permite que
    // vários arquivos (chat.js, ui.js) se inscrevam no mesmo evento sem
    // sobrescrever um ao outro.
    const listeners = {
        usuarioStatus: [],
        novaMensagem: [],
        notificacaoMensagem: [],
        usuarioDigitando: [],
        usuarioParouDigitar: [],
        erro: [],
    };

    // Apenas para depuração no console do navegador
    socket.on("connect", () => {
        console.log("[ChatFlow] Conectado ao servidor via Socket.IO");
    });

    socket.on("disconnect", () => {
        console.log("[ChatFlow] Desconectado do servidor");
    });

    // ------------------------------------------------------------------
    // Repassa cada evento recebido do servidor para todos os callbacks
    // registrados na lista correspondente (padrão observer/pub-sub simples).
    // ------------------------------------------------------------------
    socket.on("usuario_status", (dados) => listeners.usuarioStatus.forEach((cb) => cb(dados)));
    socket.on("nova_mensagem", (dados) => listeners.novaMensagem.forEach((cb) => cb(dados)));
    socket.on("notificacao_mensagem", (dados) => listeners.notificacaoMensagem.forEach((cb) => cb(dados)));
    socket.on("usuario_digitando", (dados) => listeners.usuarioDigitando.forEach((cb) => cb(dados)));
    socket.on("usuario_parou_digitar", (dados) => listeners.usuarioParouDigitar.forEach((cb) => cb(dados)));
    socket.on("erro", (dados) => listeners.erro.forEach((cb) => cb(dados)));

    // ------------------------------------------------------------------
    // API pública usada pelos outros scripts (chat.js, ui.js) através de
    // `window.ChatFlowSocket`. Mantém toda a comunicação com o servidor
    // centralizada em um único lugar.
    // ------------------------------------------------------------------
    window.ChatFlowSocket = {
        raw: socket, // acesso direto ao socket bruto, se necessário

        // --- Emissão de eventos para o servidor ---

        // Entra na "room" do Socket.IO correspondente à sala de chat,
        // necessário para começar a receber mensagens em tempo real dela.
        entrarSala(salaId) {
            socket.emit("entrar_sala", { sala_id: salaId });
        },
        // Sai da "room" ao trocar de conversa ou fechar o chat
        sairSala(salaId) {
            socket.emit("sair_sala", { sala_id: salaId });
        },
        // Envia uma nova mensagem (texto, emoji ou imagem) para a sala
        enviarMensagem(salaId, conteudo, tipo = "texto", imagemUrl = null) {
            socket.emit("enviar_mensagem", {
                sala_id: salaId,
                conteudo,
                tipo,
                imagem_url: imagemUrl,
            });
        },
        // Avisa os demais participantes que o usuário está digitando
        digitando(salaId) {
            socket.emit("digitando", { sala_id: salaId });
        },
        // Avisa que o usuário parou de digitar (usado após um pequeno delay)
        parouDigitar(salaId) {
            socket.emit("parou_digitar", { sala_id: salaId });
        },
        // Marca as mensagens da sala como lidas (zera contador de não lidas)
        marcarLida(salaId) {
            socket.emit("marcar_lida", { sala_id: salaId });
        },

        // --- Inscrição em eventos vindos do servidor ---
        aoMudarStatus(cb) { listeners.usuarioStatus.push(cb); },
        aoReceberMensagem(cb) { listeners.novaMensagem.push(cb); },
        aoReceberNotificacao(cb) { listeners.notificacaoMensagem.push(cb); },
        aoDigitar(cb) { listeners.usuarioDigitando.push(cb); },
        aoPararDigitar(cb) { listeners.usuarioParouDigitar.push(cb); },
        aoErro(cb) { listeners.erro.push(cb); },
    };
})();
