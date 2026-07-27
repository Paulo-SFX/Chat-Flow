/**
 * ui.js
 * ------
 * Interações gerais da interface do chat: modais (nova sala, buscar
 * usuário, denunciar), seletor de emojis, menu dropdown de opções da
 * sala, navegação mobile (voltar para lista de conversas), bloqueio
 * e denúncia de usuários.
 */

(function () {
    const appShell = document.getElementById("app-shell");
    if (!appShell) return;

    const AVATAR_PADRAO = "/static/images/default_avatar.png";
    function urlAvatar(foto) {
        return (!foto || foto === "default.png") ? AVATAR_PADRAO : `/uploads/avatars/${foto}`;
    }

    // ---------------------------------------------------------------
    // Helpers de modal: simplesmente adicionam/removem a classe "oculto"
    // (display:none via CSS) dos elementos de modal existentes no HTML.
    // ---------------------------------------------------------------
    function abrirModal(id) { document.getElementById(id).classList.remove("oculto"); }
    function fecharModal(id) { document.getElementById(id).classList.add("oculto"); }

    // Fecha qualquer modal ao clicar fora da caixa (na área escurecida
    // de overlay), mas não quando o clique é dentro do próprio conteúdo.
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) overlay.classList.add("oculto");
        });
    });

    // ---------------------------------------------------------------
    // Modal: Nova sala / Entrar em sala
    // Possui duas abas: "Criar sala" (formulário nome+descrição) e
    // "Entrar em sala" (lista de salas em grupo já existentes que o
    // usuário ainda não participa).
    // ---------------------------------------------------------------
    const btnNovaSala = document.getElementById("btn-nova-sala");
    const fecharModalSala = document.getElementById("fechar-modal-sala");
    const abas = document.querySelectorAll(".aba");
    const btnCriarSala = document.getElementById("btn-criar-sala");
    const listaSalasDisponiveis = document.getElementById("lista-salas-disponiveis");

    if (btnNovaSala) {
        btnNovaSala.addEventListener("click", () => {
            abrirModal("modal-nova-sala");
            carregarSalasDisponiveis();
        });
    }
    if (fecharModalSala) fecharModalSala.addEventListener("click", () => fecharModal("modal-nova-sala"));

    // Alterna entre as abas "Criar sala" / "Entrar em sala" dentro do
    // mesmo modal, mostrando/escondendo o conteúdo correspondente.
    abas.forEach((aba) => {
        aba.addEventListener("click", () => {
            abas.forEach((a) => a.classList.remove("ativa"));
            aba.classList.add("ativa");
            document.querySelectorAll(".aba-conteudo").forEach((c) => c.classList.add("oculto"));
            document.getElementById(`aba-${aba.dataset.aba}`).classList.remove("oculto");
        });
    });

    // Cria uma nova sala em grupo. Após a criação bem-sucedida, o modal
    // fecha e a sala recém-criada é aberta automaticamente (com um
    // pequeno atraso para dar tempo da lista de conversas ser atualizada
    // via `carregarConversas()`, chamada por chat.js internamente).
    if (btnCriarSala) {
        btnCriarSala.addEventListener("click", async () => {
            const nome = document.getElementById("input-nome-sala").value.trim();
            const descricao = document.getElementById("input-descricao-sala").value.trim();
            if (nome.length < 3) {
                alert("O nome da sala deve ter pelo menos 3 caracteres.");
                return;
            }
            try {
                const resp = await fetch("/api/salas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nome, descricao }),
                });
                const dados = await resp.json();
                if (dados.erro) { alert(dados.erro); return; }
                document.getElementById("input-nome-sala").value = "";
                document.getElementById("input-descricao-sala").value = "";
                fecharModal("modal-nova-sala");
                if (window._chatFlowAbrirSala) {
                    setTimeout(() => window._chatFlowAbrirSala(dados.id), 300);
                }
            } catch (e) {
                console.error("Erro ao criar sala", e);
            }
        });
    }

    // Busca as salas em grupo públicas que o usuário ainda não participa,
    // exibidas na aba "Entrar em sala" com um botão de entrada rápida.
    async function carregarSalasDisponiveis() {
        listaSalasDisponiveis.innerHTML = `<p style="color:var(--texto-terciario);font-size:13px;text-align:center;padding:20px;">Carregando...</p>`;
        try {
            const resp = await fetch("/api/salas/disponiveis");
            const salas = await resp.json();
            listaSalasDisponiveis.innerHTML = "";
            if (!salas.length) {
                listaSalasDisponiveis.innerHTML = `<p style="color:var(--texto-terciario);font-size:13px;text-align:center;padding:20px;">Nenhuma sala disponível no momento.</p>`;
                return;
            }
            salas.forEach((sala) => {
                const item = document.createElement("div");
                item.className = "item-lista-simples";
                item.innerHTML = `
                    <div class="info">
                        <strong>${sala.nome}</strong>
                        <small>${sala.descricao || "Sem descrição"}</small>
                    </div>
                    <button class="btn btn-secundario" style="padding:8px 14px;">Entrar</button>
                `;
                item.querySelector("button").addEventListener("click", async () => {
                    await fetch(`/api/salas/${sala.id}/entrar`, { method: "POST" });
                    fecharModal("modal-nova-sala");
                    if (window._chatFlowAbrirSala) window._chatFlowAbrirSala(sala.id);
                });
                listaSalasDisponiveis.appendChild(item);
            });
        } catch (e) {
            console.error("Erro ao carregar salas disponíveis", e);
        }
    }

    // ---------------------------------------------------------------
    // Modal: Buscar usuário / nova conversa — pesquisa com debounce de
    // 350ms; ao clicar em um resultado, abre (ou cria) a conversa privada
    // reutilizando `window.iniciarConversaPrivada` definida em chat.js.
    // ---------------------------------------------------------------
    const btnBuscarUsuario = document.getElementById("btn-buscar-usuario");
    const fecharModalUsuario = document.getElementById("fechar-modal-usuario");
    const inputBuscaUsuario = document.getElementById("input-busca-usuario");
    const resultadoBuscaUsuario = document.getElementById("resultado-busca-usuario");

    if (btnBuscarUsuario) btnBuscarUsuario.addEventListener("click", () => abrirModal("modal-buscar-usuario"));
    if (fecharModalUsuario) fecharModalUsuario.addEventListener("click", () => fecharModal("modal-buscar-usuario"));

    let timeoutBuscaUsuario = null;
    if (inputBuscaUsuario) {
        inputBuscaUsuario.addEventListener("input", () => {
            clearTimeout(timeoutBuscaUsuario);
            const termo = inputBuscaUsuario.value.trim();
            if (!termo) { resultadoBuscaUsuario.innerHTML = ""; return; }
            timeoutBuscaUsuario = setTimeout(async () => {
                const resp = await fetch(`/api/pesquisar/usuarios?q=${encodeURIComponent(termo)}`);
                const usuarios = await resp.json();
                resultadoBuscaUsuario.innerHTML = "";
                if (!usuarios.length) {
                    resultadoBuscaUsuario.innerHTML = `<p style="color:var(--texto-terciario);font-size:13px;text-align:center;padding:16px;">Nenhum usuário encontrado.</p>`;
                    return;
                }
                usuarios.forEach((u) => {
                    const item = document.createElement("div");
                    item.className = "item-lista-simples";
                    item.innerHTML = `
                        <img src="${urlAvatar(u.foto_perfil)}" class="avatar avatar-sm" alt="">
                        <div class="info"><strong>${u.nome_usuario}</strong></div>
                    `;
                    item.addEventListener("click", async () => {
                        fecharModal("modal-buscar-usuario");
                        inputBuscaUsuario.value = "";
                        resultadoBuscaUsuario.innerHTML = "";
                        if (window.iniciarConversaPrivada) await window.iniciarConversaPrivada(u.id);
                    });
                    resultadoBuscaUsuario.appendChild(item);
                });
            }, 350);
        });
    }

    // ---------------------------------------------------------------
    // Perfil próprio: clicar no avatar/nome do usuário na sidebar leva
    // para a página de perfil dele mesmo (/perfil/<id>).
    // ---------------------------------------------------------------
    const btnAbrirPerfil = document.getElementById("btn-abrir-perfil");
    if (btnAbrirPerfil) {
        btnAbrirPerfil.addEventListener("click", () => {
            window.location.href = `/perfil/${appShell.dataset.usuarioId}`;
        });
    }

    // ---------------------------------------------------------------
    // Seletor de emojis: monta os botões dinamicamente a partir da lista
    // definida em emoji.js (CHATFLOW_EMOJIS). Ao clicar em um emoji, ele
    // é inserido no final do campo de mensagem sem fechar o painel,
    // permitindo adicionar vários emojis seguidos.
    // ---------------------------------------------------------------
    const btnEmoji = document.getElementById("btn-emoji");
    const painelEmoji = document.getElementById("painel-emoji");
    const inputMensagem = document.getElementById("input-mensagem");

    if (btnEmoji && painelEmoji) {
        // Gera um botão para cada emoji da lista (feito uma única vez)
        if (typeof CHATFLOW_EMOJIS !== "undefined") {
            CHATFLOW_EMOJIS.forEach((emoji) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.textContent = emoji;
                btn.addEventListener("click", () => {
                    inputMensagem.value += emoji;
                    inputMensagem.focus();
                });
                painelEmoji.appendChild(btn);
            });
        }

        // Abre/fecha o painel de emojis ao clicar no botão
        btnEmoji.addEventListener("click", (e) => {
            e.stopPropagation(); // evita que o clique dispare o listener abaixo imediatamente
            painelEmoji.classList.toggle("oculto");
        });

        // Fecha o painel ao clicar em qualquer lugar fora dele
        document.addEventListener("click", (e) => {
            if (!painelEmoji.contains(e.target) && e.target !== btnEmoji) {
                painelEmoji.classList.add("oculto");
            }
        });
    }

    // ---------------------------------------------------------------
    // Dropdown de opções da sala (bloquear / denunciar / sair), acessado
    // pelo botão de "três pontinhos" no cabeçalho do chat. As ações de
    // bloquear/denunciar só fazem sentido em conversas privadas — por
    // isso dependem de `outroUsuarioId`, presente apenas nesse tipo de sala
    // (ver `atualizarCabecalhoSala` em chat.js).
    // ---------------------------------------------------------------
    const btnOpcoesSala = document.getElementById("btn-opcoes-sala");
    const dropdownOpcoesSala = document.getElementById("dropdown-opcoes-sala");

    if (btnOpcoesSala) {
        btnOpcoesSala.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdownOpcoesSala.classList.toggle("oculto");
        });
        // Fecha o dropdown ao clicar fora dele
        document.addEventListener("click", (e) => {
            if (!dropdownOpcoesSala.contains(e.target) && e.target !== btnOpcoesSala) {
                dropdownOpcoesSala.classList.add("oculto");
            }
        });

        // Cada botão do dropdown tem um atributo data-acao ("sair",
        // "bloquear" ou "denunciar") que define o que fazer ao clicar.
        dropdownOpcoesSala.querySelectorAll("button").forEach((btn) => {
            btn.addEventListener("click", async () => {
                dropdownOpcoesSala.classList.add("oculto");
                const acao = btn.dataset.acao;
                const outroUsuarioId = document.getElementById("chat-header-avatar").dataset.outroUsuarioId;
                const salaId = window._chatFlowSalaAtual ? window._chatFlowSalaAtual() : null;

                if (acao === "sair" && salaId) {
                    if (confirm("Deseja realmente sair desta sala?")) {
                        await fetch(`/api/salas/${salaId}/sair`, { method: "POST" });
                        window.location.reload();
                    }
                } else if (acao === "bloquear" && outroUsuarioId) {
                    if (confirm("Deseja bloquear este usuário? Vocês não poderão mais trocar mensagens.")) {
                        await fetch(`/api/usuarios/${outroUsuarioId}/bloquear`, { method: "POST" });
                        alert("Usuário bloqueado.");
                    }
                } else if (acao === "denunciar" && outroUsuarioId) {
                    window._usuarioParaDenunciar = outroUsuarioId;
                    abrirModal("modal-denunciar");
                } else if (acao === "bloquear" || acao === "denunciar") {
                    alert("Esta ação está disponível apenas em conversas privadas.");
                }
            });
        });
    }

    // ---------------------------------------------------------------
    // Modal de denúncia (compartilhado entre chat.html e profile.html —
    // por isso o mesmo HTML de modal é reaproveitado nas duas telas, e
    // profile.js tem uma lógica equivalente para quando o modal é aberto
    // a partir da página de perfil em vez do dropdown do chat).
    // ---------------------------------------------------------------
    const fecharModalDenunciar = document.getElementById("fechar-modal-denunciar");
    const btnEnviarDenuncia = document.getElementById("btn-enviar-denuncia");

    if (fecharModalDenunciar) fecharModalDenunciar.addEventListener("click", () => fecharModal("modal-denunciar"));

    if (btnEnviarDenuncia) {
        btnEnviarDenuncia.addEventListener("click", async () => {
            const motivo = document.getElementById("select-motivo-denuncia").value;
            const detalhes = document.getElementById("input-detalhes-denuncia").value.trim();
            const usuarioId = window._usuarioParaDenunciar;
            if (!usuarioId) return;

            try {
                const resp = await fetch(`/api/usuarios/${usuarioId}/denunciar`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ motivo, detalhes }),
                });
                const dados = await resp.json();
                if (dados.erro) { alert(dados.erro); return; }
                alert(dados.mensagem || "Denúncia enviada.");
                fecharModal("modal-denunciar");
                document.getElementById("input-detalhes-denuncia").value = "";
            } catch (e) {
                console.error("Erro ao enviar denúncia", e);
            }
        });
    }

    // ---------------------------------------------------------------
    // Navegação mobile: em telas estreitas, o layout de 3 colunas vira
    // uma navegação por telas (conversas -> chat). Este botão "seta para
    // trás" no cabeçalho do chat volta para a lista de conversas,
    // revertendo as classes aplicadas em `abrirSala()` (chat.js).
    // ---------------------------------------------------------------
    const btnVoltarConversas = document.getElementById("btn-voltar-conversas");
    if (btnVoltarConversas) {
        btnVoltarConversas.addEventListener("click", () => {
            document.getElementById("area-chat").classList.remove("ativa-mobile");
            document.querySelector(".painel-conversas").classList.remove("chat-selecionado");
        });
    }
})();
