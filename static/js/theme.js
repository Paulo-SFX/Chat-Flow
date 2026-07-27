/**
 * theme.js
 * ---------
 * Controla a alternância entre tema claro e escuro, persistindo a
 * preferência do usuário em localStorage (chave "chatflow_tema").
 *
 * O tema em si é implementado via atributo `data-tema` na tag <html>,
 * que ativa as variáveis CSS corretas definidas em variables.css.
 */

(function () {
    const TEMA_STORAGE_KEY = "chatflow_tema";

    /**
     * Aplica um tema ("claro" ou "escuro") em toda a página e sincroniza
     * a interface (ícone do botão e seleção na tela de configurações).
     */
    function aplicarTema(tema) {
        // O atributo data-tema no <html> é o gatilho para o CSS trocar
        // todas as variáveis de cor (ver static/css/variables.css)
        document.documentElement.setAttribute("data-tema", tema);
        localStorage.setItem(TEMA_STORAGE_KEY, tema);

        // Atualiza ícone do botão de alternância (se existir na página) —
        // lua para tema escuro, sol para tema claro
        const btnTema = document.getElementById("btn-tema");
        if (btnTema) {
            const icone = btnTema.querySelector("i");
            if (icone) {
                icone.className = tema === "escuro" ? "fa-solid fa-moon" : "fa-solid fa-sun";
            }
        }

        // Marca visualmente qual opção está ativa na página de configurações
        // (se o usuário estiver nela). Não faz nada nas demais páginas.
        document.querySelectorAll(".opcao-tema").forEach((el) => {
            el.classList.toggle("selecionado", el.dataset.tema === tema);
        });
    }

    /** Alterna entre claro/escuro a partir do tema atualmente ativo. */
    function alternarTema() {
        const atual = document.documentElement.getAttribute("data-tema") || "escuro";
        aplicarTema(atual === "escuro" ? "claro" : "escuro");
    }

    // Aplica o tema salvo (ou "escuro" como padrão) assim que o script
    // carrega, antes mesmo do DOMContentLoaded, para evitar "flash" de
    // tema errado ao carregar a página.
    const temaSalvo = localStorage.getItem(TEMA_STORAGE_KEY) || "escuro";
    aplicarTema(temaSalvo);

    document.addEventListener("DOMContentLoaded", () => {
        // Botão de alternância rápida (presente na sidebar/topbar)
        const btnTema = document.getElementById("btn-tema");
        if (btnTema) btnTema.addEventListener("click", alternarTema);

        // Cards de seleção de tema na página de configurações
        document.querySelectorAll(".opcao-tema").forEach((el) => {
            el.addEventListener("click", () => aplicarTema(el.dataset.tema));
        });
    });

    // Expõe funções publicamente caso outro script precise consultar/mudar o tema
    window.ChatFlowTema = { aplicarTema, alternarTema };
})();
