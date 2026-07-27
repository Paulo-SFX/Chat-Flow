/**
 * emoji.js
 * ---------
 * Lista simples de emojis usados no seletor do campo de mensagem.
 *
 * Este array é consumido por `ui.js`, que monta dinamicamente o painel
 * de emojis (#painel-emoji) exibido ao clicar no botão de carinha feliz
 * dentro do campo de digitação. Mantido em um arquivo separado para
 * facilitar a manutenção/expansão da lista sem mexer na lógica de UI.
 */

const CHATFLOW_EMOJIS = [
    // Expressões faciais / emoções
    "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😜", "🤔", "😎",
    "😴", "😭", "😡", "🥳", "😱", "🤗", "🙄", "😇", "🤩", "🥺",

    // Gestos / mãos
    "👍", "👎", "👏", "🙌", "🤝", "🙏", "💪", "✌️", "🤞", "👋",

    // Objetos / símbolos populares
    "❤️", "🔥", "🎉", "✨", "💯", "🎂", "☕", "🍕", "⚽", "🎮",

    // Mais expressões faciais
    "😢", "😅", "😆", "🤯", "🤤", "🥰", "😏", "🤫", "🤐", "😬"
];
