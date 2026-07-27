/**
 * auth.js
 * --------
 * Comportamentos das telas de login e cadastro:
 * - Alternar visibilidade da senha
 * - Auto-remover mensagens flash após alguns segundos
 */

document.addEventListener("DOMContentLoaded", () => {

    // ------------------------------------------------------------------
    // Botão de "olho" para mostrar/ocultar a senha digitada nos campos
    // de senha (login e cadastro). Cada botão tem a classe .toggle-senha
    // e fica ao lado do <input type="password">.
    // ------------------------------------------------------------------
    document.querySelectorAll(".toggle-senha").forEach((botao) => {
        botao.addEventListener("click", () => {
            const input = botao.parentElement.querySelector("input");
            const icone = botao.querySelector("i");

            // Se já está como "text", o clique deve voltar para "password"
            const visivel = input.type === "text";
            input.type = visivel ? "password" : "text";

            // Troca o ícone do olho (aberto/fechado) de acordo com o estado
            icone.className = visivel ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
        });
    });

    // ------------------------------------------------------------------
    // Mensagens "flash" (avisos de sucesso/erro vindos do Flask via
    // `flash()`) somem automaticamente depois de alguns segundos,
    // com uma transição suave de opacidade antes de serem removidas do DOM.
    // ------------------------------------------------------------------
    const flashContainer = document.getElementById("flash-container");
    if (flashContainer) {
        setTimeout(() => {
            flashContainer.querySelectorAll(".flash").forEach((el) => {
                el.style.transition = "opacity 0.4s ease";
                el.style.opacity = "0";
                // Aguarda a transição terminar antes de remover o elemento
                setTimeout(() => el.remove(), 400);
            });
        }, 5000);
    }
});
