/**
 * profile.js
 * ------------
 * Lógica da página de perfil de outro usuário:
 * - Iniciar conversa privada
 * - Bloquear / desbloquear
 * - Abrir modal de denúncia
 *
 * Todos os elementos são opcionais (verificados com `if`) porque esta
 * mesma página também é usada para exibir o próprio perfil do usuário
 * logado, caso em que os botões de bloquear/denunciar não são renderizados.
 */

document.addEventListener("DOMContentLoaded", () => {
    const btnIniciarConversa = document.getElementById("btn-iniciar-conversa");
    const btnToggleBloqueio = document.getElementById("btn-toggle-bloqueio");
    const btnAbrirDenuncia = document.getElementById("btn-abrir-denuncia");

    // ------------------------------------------------------------------
    // Botão "Enviar mensagem": chama a API que busca (ou cria) a sala
    // privada entre o usuário logado e o dono do perfil, depois redireciona
    // para a tela principal do chat já com a conversa criada.
    // ------------------------------------------------------------------
    if (btnIniciarConversa) {
        btnIniciarConversa.addEventListener("click", async () => {
            const usuarioId = btnIniciarConversa.dataset.usuarioId;
            try {
                const resp = await fetch(`/api/conversas/privada/${usuarioId}`, { method: "POST" });
                const dados = await resp.json();
                if (dados.erro) { alert(dados.erro); return; }
                // A sala já foi criada/localizada no backend; basta voltar
                // para a tela do chat, onde ela aparecerá na lista de conversas.
                window.location.href = "/";
            } catch (e) {
                console.error(e);
            }
        });
    }

    // ------------------------------------------------------------------
    // Botão "Bloquear/Desbloquear": alterna o estado de bloqueio do usuário.
    // Ao bloquear, pede confirmação porque a ação impede o envio de novas
    // mensagens entre as partes.
    // ------------------------------------------------------------------
    if (btnToggleBloqueio) {
        btnToggleBloqueio.addEventListener("click", async () => {
            const usuarioId = btnToggleBloqueio.dataset.usuarioId;
            const bloqueadoAtualmente = btnToggleBloqueio.dataset.bloqueado === "true";
            const rota = bloqueadoAtualmente ? "desbloquear" : "bloquear";

            // Confirmação apenas ao bloquear (ação mais "destrutiva")
            if (!bloqueadoAtualmente && !confirm("Deseja realmente bloquear este usuário?")) return;

            try {
                await fetch(`/api/usuarios/${usuarioId}/${rota}`, { method: "POST" });
                // Atualiza o estado do botão localmente sem precisar recarregar a página
                btnToggleBloqueio.dataset.bloqueado = (!bloqueadoAtualmente).toString();
                btnToggleBloqueio.querySelector("span").textContent = bloqueadoAtualmente ? "Bloquear" : "Desbloquear";
            } catch (e) {
                console.error(e);
            }
        });
    }

    // ------------------------------------------------------------------
    // Modal de denúncia: abre/fecha e envia o motivo + detalhes escolhidos
    // pelo usuário para a rota de denúncia no backend.
    // ------------------------------------------------------------------
    if (btnAbrirDenuncia) {
        btnAbrirDenuncia.addEventListener("click", () => {
            // Guarda o id do usuário denunciado em uma variável global
            // simples, já que só existe um modal de denúncia por página.
            window._usuarioParaDenunciar = btnAbrirDenuncia.dataset.usuarioId;
            document.getElementById("modal-denunciar").classList.remove("oculto");
        });
    }

    const fecharModalDenunciar = document.getElementById("fechar-modal-denunciar");
    const btnEnviarDenuncia = document.getElementById("btn-enviar-denuncia");

    if (fecharModalDenunciar) {
        fecharModalDenunciar.addEventListener("click", () => {
            document.getElementById("modal-denunciar").classList.add("oculto");
        });
    }

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
                document.getElementById("modal-denunciar").classList.add("oculto");
            } catch (e) {
                console.error(e);
            }
        });
    }
});
