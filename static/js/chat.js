/**
 * chat.js
 * --------
 * Lógica principal da tela de chat: carregar conversas, abrir salas,
 * enviar/receber mensagens, indicador de digitação, upload de imagens,
 * pesquisa de usuários/mensagens, notificações e contador de não lidas.
 */

(function () {
    const appShell = document.getElementById("app-shell");
    if (!appShell) return; // Esta página não é a tela de chat

    const USUARIO_ID = parseInt(appShell.dataset.usuarioId, 10);
    const AVATAR_PADRAO = "/static/images/default_avatar.png";

    // --- Estado da tela mantido em memória (não persiste em localStorage) ---
    let salaAtualId = null;       // id da sala/conversa atualmente aberta
    let salasCache = [];          // última lista de conversas carregada da API
    let timeoutDigitando = null;  // timer usado para detectar quando o usuário parou de digitar
    let ultimaMensagemId = null;  // id da última mensagem renderizada (útil para paginação futura)

    // ---------------------------------------------------------------
    // Elementos do DOM usados nesta tela (busca única no carregamento)
    // ---------------------------------------------------------------
    const listaConversas = document.getElementById("lista-conversas");
    const conversasVazio = document.getElementById("conversas-vazio");
    const listaOnline = document.getElementById("lista-online");
    const contadorOnline = document.getElementById("contador-online");

    const chatVazio = document.getElementById("chat-vazio");
    const chatAtivo = document.getElementById("chat-ativo");
    const chatHeaderAvatar = document.getElementById("chat-header-avatar");
    const chatHeaderNome = document.getElementById("chat-header-nome");
    const chatHeaderStatus = document.getElementById("chat-header-status");

    const mensagensLista = document.getElementById("mensagens-lista");
    const mensagensContainer = document.getElementById("mensagens-container");
    const indicadorDigitando = document.getElementById("indicador-digitando");
    const textoDigitando = document.getElementById("texto-digitando");

    const formMensagem = document.getElementById("form-mensagem");
    const inputMensagem = document.getElementById("input-mensagem");
    const inputImagem = document.getElementById("input-imagem");
    const btnAnexar = document.getElementById("btn-anexar");

    const inputBusca = document.getElementById("input-busca");
    const resultadoBusca = document.getElementById("resultado-busca");

    const notificacoesFlutuantes = document.getElementById("notificacoes-flutuantes");

    // ---------------------------------------------------------------
    // Utilitários
    // ---------------------------------------------------------------
    // Retorna a URL da foto de perfil de um usuário, ou o avatar padrão
    // caso ele nunca tenha feito upload de uma foto própria.
    function urlAvatar(foto) {
        if (!foto || foto === "default.png") return AVATAR_PADRAO;
        return `/uploads/avatars/${foto}`;
    }

    // Retorna a URL de uma imagem enviada dentro do chat
    function urlImagemChat(nome) {
        return `/uploads/chat_images/${nome}`;
    }

    // Formata um horário ISO (vindo do backend) como "HH:MM" — usado
    // no rodapé de cada balão de mensagem.
    function formatarHora(isoString) {
        const data = new Date(isoString);
        return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    // Formata o horário da última mensagem exibido na lista de conversas:
    // mostra só a hora se for hoje, ou a data (dia/mês) caso contrário.
    function formatarHoraConversa(isoString) {
        if (!isoString) return "";
        const data = new Date(isoString);
        const hoje = new Date();
        const mesmaData = data.toDateString() === hoje.toDateString();
        if (mesmaData) {
            return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        }
        return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    }

    // Escapa caracteres HTML antes de inserir texto vindo do usuário no
    // DOM via innerHTML, prevenindo ataques de XSS através de mensagens
    // ou nomes de usuário maliciosos.
    function escapeHtml(texto) {
        const div = document.createElement("div");
        div.textContent = texto ?? "";
        return div.innerHTML;
    }

    // Toca um "beep" curto e discreto usando a Web Audio API quando uma
    // notificação de nova mensagem chega (sem precisar de arquivo de áudio).
    function tocarSomNotificacao() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(880, ctx.currentTime); // tom agudo e curto
            gain.gain.setValueAtTime(0.08, ctx.currentTime);    // volume baixo
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25); // fade-out
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        } catch (e) { /* silencioso — alguns navegadores bloqueiam áudio sem interação prévia */ }
    }

    // ---------------------------------------------------------------
    // Carregar lista de conversas
    // ---------------------------------------------------------------
    // Busca a lista de conversas do usuário logado (com última mensagem
    // e contador de não lidas) e atualiza a sidebar. Chamada na
    // inicialização e sempre que uma mensagem é enviada/recebida.
    async function carregarConversas() {
        try {
            const resp = await fetch("/api/conversas");
            const salas = await resp.json();
            salasCache = salas; // guarda em cache para uso em outras funções (ex: header da sala)
            renderizarConversas(salas);
        } catch (e) {
            console.error("Erro ao carregar conversas", e);
        }
    }

    // Reconstrói a lista de conversas na sidebar a partir dos dados da API.
    // Remove os itens antigos antes de recriar para manter a lista sempre
    // sincronizada com o backend (mensagens não lidas, última mensagem, etc).
    function renderizarConversas(salas) {
        listaConversas.querySelectorAll(".item-conversa").forEach((el) => el.remove());
        conversasVazio.classList.toggle("oculto", salas.length > 0);

        salas.forEach((sala) => {
            const item = document.createElement("div");
            item.className = "item-conversa";
            item.dataset.salaId = sala.sala_id;
            if (sala.sala_id === salaAtualId) item.classList.add("ativa");

            const nome = sala.nome_exibicao || sala.nome;
            const foto = sala.foto_exibicao;
            const statusOnline = sala.tipo === "privada" && sala.outro_status_online;

            let previewMensagem = sala.ultima_mensagem_tipo === "imagem"
                ? "📷 Imagem"
                : (sala.ultima_mensagem || "Nenhuma mensagem ainda");

            item.innerHTML = `
                <div class="conversa-avatar-wrap">
                    <img src="${urlAvatar(foto)}" class="avatar avatar-md" alt="">
                    ${sala.tipo === "privada" ? `<span class="status-dot ${statusOnline ? "online" : ""}"></span>` : ""}
                </div>
                <div class="conversa-info">
                    <div class="conversa-linha-topo">
                        <span class="conversa-nome">${escapeHtml(nome)}</span>
                        <span class="conversa-hora">${formatarHoraConversa(sala.ultima_mensagem_hora)}</span>
                    </div>
                    <div class="conversa-linha-topo">
                        <span class="conversa-ultima">${escapeHtml(previewMensagem)}</span>
                        ${sala.nao_lidas > 0 ? `<span class="badge-nao-lida">${sala.nao_lidas > 99 ? "99+" : sala.nao_lidas}</span>` : ""}
                    </div>
                </div>
            `;
            item.addEventListener("click", () => abrirSala(sala.sala_id));
            listaConversas.appendChild(item);
        });
    }

    // ---------------------------------------------------------------
    // Usuários online — lista exibida na sidebar, atualizada
    // inicialmente com dados renderizados pelo servidor e depois mantida
    // em sincronia através dos eventos "usuario_status" do Socket.IO.
    // ---------------------------------------------------------------
    function renderizarOnline(usuarios) {
        listaOnline.innerHTML = "";
        contadorOnline.textContent = `(${usuarios.length})`;
        usuarios.forEach((u) => {
            if (u.id === USUARIO_ID) return;
            const item = document.createElement("div");
            item.className = "usuario-online-item";
            item.innerHTML = `
                <img src="${urlAvatar(u.foto_perfil)}" class="avatar avatar-sm" alt="">
                <span>${escapeHtml(u.nome_usuario)}</span>
            `;
            item.addEventListener("click", () => iniciarConversaPrivada(u.id));
            listaOnline.appendChild(item);
        });
    }

    // Lê a lista inicial de usuários online, que vem embutida no HTML
    // (renderizada pelo Flask/Jinja2 em um <script type="application/json">)
    // evitando uma chamada extra à API só para o primeiro carregamento.
    function carregarOnlineInicial() {
        const tag = document.getElementById("dados-usuarios-online");
        if (!tag) return;
        try {
            const usuarios = JSON.parse(tag.textContent);
            renderizarOnline(usuarios);
        } catch (e) {
            console.error("Erro ao carregar usuários online iniciais", e);
        }
    }

    // ---------------------------------------------------------------
    // Abrir sala / histórico
    // ---------------------------------------------------------------
    // Abre uma sala de chat: sai da sala anterior (Socket.IO room), entra
    // na nova, carrega histórico e participantes, e atualiza o cabeçalho.
    // Também cuida da navegação mobile (mostra a área de chat em telas
    // pequenas via classe "ativa-mobile").
    async function abrirSala(salaId) {
        if (salaAtualId) {
            window.ChatFlowSocket.sairSala(salaAtualId);
        }
        salaAtualId = salaId;
        ultimaMensagemId = null;

        // Destaca visualmente a conversa selecionada na lista
        document.querySelectorAll(".item-conversa").forEach((el) => {
            el.classList.toggle("ativa", parseInt(el.dataset.salaId, 10) === salaId);
        });

        chatVazio.classList.add("oculto");
        chatAtivo.classList.remove("oculto");
        // Em telas pequenas, alterna do painel de conversas para o painel de chat
        document.getElementById("area-chat").classList.add("ativa-mobile");
        document.querySelector(".painel-conversas").classList.add("chat-selecionado");

        window.ChatFlowSocket.entrarSala(salaId);
        window.ChatFlowSocket.marcarLida(salaId);

        atualizarCabecalhoSala(salaId);
        await carregarHistorico(salaId);
        await carregarParticipantesSala(salaId);
        carregarConversas(); // atualiza contador de não lidas na sidebar
    }

    // Preenche o cabeçalho do chat (nome, foto e status online/offline
    // para conversas privadas, ou "Sala em grupo" para salas em grupo).
    function atualizarCabecalhoSala(salaId) {
        const sala = salasCache.find((s) => s.sala_id === salaId);
        if (!sala) return;
        chatHeaderNome.textContent = sala.nome_exibicao || sala.nome;
        chatHeaderAvatar.src = urlAvatar(sala.foto_exibicao);
        if (sala.tipo === "privada") {
            const online = sala.outro_status_online;
            chatHeaderStatus.textContent = online ? "Online" : "Offline";
            chatHeaderStatus.classList.toggle("online", !!online);
            chatHeaderAvatar.dataset.outroUsuarioId = sala.outro_usuario_id;
        } else {
            chatHeaderStatus.textContent = "Sala em grupo";
            chatHeaderStatus.classList.remove("online");
            chatHeaderAvatar.removeAttribute("data-outro-usuario-id");
        }
    }

    // Busca os participantes da sala (usado, por exemplo, para exibir
    // avatares/nomes em salas de grupo). Guardado em uma variável global
    // simples para consulta rápida por outras partes da UI, se necessário.
    async function carregarParticipantesSala(salaId) {
        try {
            const resp = await fetch(`/api/salas/${salaId}/participantes`);
            const participantes = await resp.json();
            window._participantesSalaAtual = participantes;
        } catch (e) { /* ignora */ }
    }

    // Carrega o histórico de mensagens do MySQL para a sala selecionada e
    // renderiza cada uma como um balão. `animar = false` evita reaplicar
    // a animação de entrada em mensagens antigas (só mensagens novas
    // recebidas em tempo real devem "deslizar" para dentro da tela).
    async function carregarHistorico(salaId) {
        mensagensLista.innerHTML = "";
        try {
            const resp = await fetch(`/api/salas/${salaId}/historico`);
            const mensagens = await resp.json();
            mensagens.forEach((m) => renderizarMensagem(m, false));
            rolarParaFinal();
        } catch (e) {
            console.error("Erro ao carregar histórico", e);
        }
    }

    // ---------------------------------------------------------------
    // Renderização de mensagens (balões estilo WhatsApp/Discord)
    // ---------------------------------------------------------------
    // Cria e insere o balão de uma mensagem na lista. Mensagens do próprio
    // usuário recebem a classe "propria" (alinhadas à direita, cor
    // diferente — ver style.css), enquanto mensagens de outros usuários
    // mostram o nome do remetente acima do balão.
    function renderizarMensagem(msg, animar = true) {
        const propria = msg.remetente_id === USUARIO_ID;
        const linha = document.createElement("div");
        linha.className = `mensagem-linha ${propria ? "propria" : ""}`;
        if (!animar) linha.style.animation = "none"; // desativa animação ao carregar histórico

        // Mensagens de imagem mostram a foto (clicável para abrir em
        // tamanho real); mensagens de texto/emoji mostram o conteúdo
        // já escapado para evitar XSS.
        let conteudoHtml;
        if (msg.tipo === "imagem") {
            conteudoHtml = `
                <div class="bolha bolha-imagem">
                    <img src="${urlImagemChat(msg.imagem_url)}" alt="Imagem enviada" onclick="window.open(this.src, '_blank')">
                </div>`;
        } else {
            conteudoHtml = `<div class="bolha">${escapeHtml(msg.conteudo)}</div>`;
        }

        linha.innerHTML = `
            <img src="${urlAvatar(msg.foto_perfil)}" class="avatar avatar-sm" alt="">
            <div class="bolha-wrap">
                ${!propria ? `<span class="nome-remetente">${escapeHtml(msg.nome_usuario)}</span>` : ""}
                ${conteudoHtml}
                <span class="hora-mensagem">${formatarHora(msg.enviado_em)}</span>
            </div>
        `;
        mensagensLista.appendChild(linha);
        ultimaMensagemId = msg.id;
    }

    // Rola o container de mensagens para o final (última mensagem visível)
    function rolarParaFinal() {
        mensagensContainer.scrollTop = mensagensContainer.scrollHeight;
    }

    // ---------------------------------------------------------------
    // Envio de mensagens
    // ---------------------------------------------------------------
    // Envia a mensagem de texto digitada via Socket.IO (não usa fetch/HTTP
    // — o próprio servidor emite de volta "nova_mensagem" para todos na
    // sala, incluindo quem enviou, então não renderizamos aqui diretamente).
    formMensagem.addEventListener("submit", (e) => {
        e.preventDefault();
        const texto = inputMensagem.value.trim();
        if (!texto || !salaAtualId) return;
        window.ChatFlowSocket.enviarMensagem(salaAtualId, texto, "texto");
        inputMensagem.value = "";
        window.ChatFlowSocket.parouDigitar(salaAtualId);
    });

    // Emite o evento "digitando" a cada tecla pressionada (com um pequeno
    // debounce de 1.5s): se o usuário parar de digitar por esse tempo,
    // avisa os demais participantes que ele parou. Isso evita que o
    // indicador "fulano está digitando..." fique travado na tela.
    inputMensagem.addEventListener("input", () => {
        if (!salaAtualId) return;
        window.ChatFlowSocket.digitando(salaAtualId);
        clearTimeout(timeoutDigitando);
        timeoutDigitando = setTimeout(() => {
            window.ChatFlowSocket.parouDigitar(salaAtualId);
        }, 1500);
    });

    // ---------------------------------------------------------------
    // Upload de imagem no chat
    // ---------------------------------------------------------------
    // Botão de clipe abre o seletor de arquivo escondido
    btnAnexar.addEventListener("click", () => inputImagem.click());

    // Ao escolher uma imagem: primeiro faz upload via HTTP (multipart/
    // FormData) para salvar o arquivo no servidor, e só depois envia a
    // mensagem de tipo "imagem" via Socket.IO contendo apenas o nome do
    // arquivo salvo (o binário da imagem nunca trafega pelo WebSocket).
    inputImagem.addEventListener("change", async () => {
        const arquivo = inputImagem.files[0];
        if (!arquivo || !salaAtualId) return;

        const formData = new FormData();
        formData.append("arquivo", arquivo);
        formData.append("sala_id", salaAtualId);

        try {
            const resp = await fetch("/api/upload/chat-image", { method: "POST", body: formData });
            const dados = await resp.json();
            if (dados.erro) {
                alert(dados.erro);
                return;
            }
            window.ChatFlowSocket.enviarMensagem(salaAtualId, null, "imagem", dados.imagem_url);
        } catch (e) {
            console.error("Erro ao enviar imagem", e);
        } finally {
            inputImagem.value = ""; // permite selecionar o mesmo arquivo novamente depois
        }
    });

    // ---------------------------------------------------------------
    // Eventos recebidos via Socket.IO
    // ---------------------------------------------------------------
    // Nova mensagem chegou: só renderiza no balão se o usuário estiver
    // com a sala correspondente aberta no momento; caso contrário, a
    // atualização da lista de conversas fica a cargo do evento
    // "notificacao_mensagem" abaixo.
    window.ChatFlowSocket.aoReceberMensagem((msg) => {
        if (msg.sala_id === salaAtualId) {
            renderizarMensagem(msg);
            rolarParaFinal();
            window.ChatFlowSocket.marcarLida(salaAtualId);
        }
    });

    // Notificação de mensagem em qualquer sala do usuário (mesmo as que
    // não estão abertas): sempre atualiza a lista de conversas (para
    // refletir a última mensagem e o contador de não lidas) e, se a sala
    // não for a que está aberta, toca um som e mostra um toast flutuante.
    window.ChatFlowSocket.aoReceberNotificacao(({ sala_id, mensagem }) => {
        carregarConversas();
        if (sala_id !== salaAtualId) {
            tocarSomNotificacao();
            mostrarNotificacaoFlutuante(mensagem);
        }
    });

    // Exibe "fulano está digitando..." apenas se o evento for da sala
    // atualmente aberta na tela.
    window.ChatFlowSocket.aoDigitar(({ sala_id, nome_usuario }) => {
        if (sala_id !== salaAtualId) return;
        textoDigitando.textContent = `${nome_usuario} está digitando...`;
        indicadorDigitando.classList.remove("oculto");
        rolarParaFinal();
    });

    // Esconde o indicador de digitação quando o outro usuário parar
    window.ChatFlowSocket.aoPararDigitar(({ sala_id }) => {
        if (sala_id !== salaAtualId) return;
        indicadorDigitando.classList.add("oculto");
    });

    // Atualiza o status online/offline no cabeçalho da conversa privada
    // aberta (se aplicável) sempre que qualquer usuário mudar de status.
    window.ChatFlowSocket.aoMudarStatus(({ usuario_id, online }) => {
        carregarConversas();
        const sala = salasCache.find((s) => s.outro_usuario_id === usuario_id);
        if (sala && sala.sala_id === salaAtualId) {
            chatHeaderStatus.textContent = online ? "Online" : "Offline";
            chatHeaderStatus.classList.toggle("online", online);
        }
        atualizarListaOnlineNoDOM(usuario_id, online);
    });

    // Exibe qualquer erro genérico vindo do servidor (ex: tentativa de
    // enviar mensagem para usuário bloqueado, sala inexistente, etc.)
    window.ChatFlowSocket.aoErro(({ mensagem }) => {
        alert(mensagem || "Ocorreu um erro.");
    });

    // Atualização "best-effort" da lista de online: dispara uma busca
    // leve apenas para forçar uma nova renderização caso necessário.
    // A lista de conversas (já recarregada acima) cobre a maior parte
    // da necessidade de refletir o novo status do usuário.
    function atualizarListaOnlineNoDOM(usuarioId, online) {
        fetch("/api/pesquisar/usuarios?q=").catch(() => {});
    }

    // Cria um "toast" flutuante no canto da tela ao receber mensagem de
    // uma conversa que não está aberta no momento. Some sozinho após 6s,
    // ou pode ser clicado para abrir a conversa diretamente.
    function mostrarNotificacaoFlutuante(msg) {
        const toast = document.createElement("div");
        toast.className = "notificacao-toast";
        const preview = msg.tipo === "imagem" ? "Enviou uma imagem" : msg.conteudo;
        toast.innerHTML = `
            <img src="${urlAvatar(msg.foto_perfil)}" class="avatar avatar-sm" alt="">
            <div>
                <strong>${escapeHtml(msg.nome_usuario)}</strong>
                <p>${escapeHtml(preview)}</p>
            </div>
        `;
        toast.addEventListener("click", () => {
            abrirSala(msg.sala_id);
            toast.remove();
        });
        notificacoesFlutuantes.appendChild(toast);
        setTimeout(() => toast.remove(), 6000);
    }

    // ---------------------------------------------------------------
    // Pesquisa (conversas / mensagens)
    // ---------------------------------------------------------------
    // Debounce de 350ms para não disparar uma requisição a cada tecla
    let timeoutBusca = null;
    inputBusca.addEventListener("input", () => {
        clearTimeout(timeoutBusca);
        const termo = inputBusca.value.trim();
        if (!termo) {
            resultadoBusca.classList.add("oculto");
            resultadoBusca.innerHTML = "";
            return;
        }
        timeoutBusca = setTimeout(() => pesquisar(termo), 350);
    });

    // Pesquisa usuários e mensagens em paralelo (Promise.all) e monta um
    // painel de resultados agrupado por categoria ("Usuários" / "Mensagens").
    async function pesquisar(termo) {
        try {
            const [respUsuarios, respMensagens] = await Promise.all([
                fetch(`/api/pesquisar/usuarios?q=${encodeURIComponent(termo)}`),
                fetch(`/api/pesquisar/mensagens?q=${encodeURIComponent(termo)}`),
            ]);
            const usuarios = await respUsuarios.json();
            const mensagens = await respMensagens.json();

            resultadoBusca.classList.remove("oculto");
            resultadoBusca.innerHTML = "";

            if (usuarios.length) {
                const tituloU = document.createElement("div");
                tituloU.style.cssText = "padding:10px 12px 4px;font-size:11px;color:var(--texto-terciario);text-transform:uppercase;";
                tituloU.textContent = "Usuários";
                resultadoBusca.appendChild(tituloU);
                usuarios.forEach((u) => {
                    const item = document.createElement("div");
                    item.className = "item-lista-simples";
                    item.innerHTML = `
                        <img src="${urlAvatar(u.foto_perfil)}" class="avatar avatar-sm" alt="">
                        <div class="info"><strong>${escapeHtml(u.nome_usuario)}</strong></div>
                    `;
                    item.addEventListener("click", () => iniciarConversaPrivada(u.id));
                    resultadoBusca.appendChild(item);
                });
            }

            if (mensagens.length) {
                const tituloM = document.createElement("div");
                tituloM.style.cssText = "padding:10px 12px 4px;font-size:11px;color:var(--texto-terciario);text-transform:uppercase;";
                tituloM.textContent = "Mensagens";
                resultadoBusca.appendChild(tituloM);
                mensagens.forEach((m) => {
                    const item = document.createElement("div");
                    item.className = "item-lista-simples";
                    item.innerHTML = `
                        <img src="${urlAvatar(m.foto_perfil)}" class="avatar avatar-sm" alt="">
                        <div class="info">
                            <strong>${escapeHtml(m.nome_usuario)}</strong>
                            <small>${escapeHtml(m.conteudo || "")} — ${escapeHtml(m.sala_nome || "")}</small>
                        </div>
                    `;
                    item.addEventListener("click", () => abrirSala(m.sala_id));
                    resultadoBusca.appendChild(item);
                });
            }

            if (!usuarios.length && !mensagens.length) {
                resultadoBusca.innerHTML = `<div style="padding:16px;text-align:center;color:var(--texto-terciario);font-size:13px;">Nenhum resultado encontrado.</div>`;
            }
        } catch (e) {
            console.error("Erro na pesquisa", e);
        }
    }

    // ---------------------------------------------------------------
    // Iniciar conversa privada
    // ---------------------------------------------------------------
    // Exposta globalmente (window) porque é chamada tanto por este
    // arquivo quanto pelo ui.js (ex: ao clicar em um resultado de busca
    // de usuário ou em um usuário da lista de "online").
    window.iniciarConversaPrivada = async function (outroUsuarioId) {
        try {
            const resp = await fetch(`/api/conversas/privada/${outroUsuarioId}`, { method: "POST" });
            const dados = await resp.json();
            if (dados.erro) {
                alert(dados.erro);
                return;
            }
            resultadoBusca.classList.add("oculto");
            inputBusca.value = "";
            await carregarConversas();
            abrirSala(dados.sala_id);
        } catch (e) {
            console.error("Erro ao iniciar conversa", e);
        }
    };

    // ---------------------------------------------------------------
    // Inicialização: carrega conversas e usuários online assim que a
    // tela do chat é montada. As funções são expostas em `window` para
    // que ui.js (responsável pela criação de salas, modais, etc.) possa
    // reutilizá-las sem duplicar lógica.
    // ---------------------------------------------------------------
    carregarConversas();
    carregarOnlineInicial();

    window._chatFlowAbrirSala = abrirSala;
    window._chatFlowSalaAtual = () => salaAtualId;
})();
