/**
 * settings.js
 * -------------
 * Lógica da página de configurações: upload de avatar, alteração de
 * nome de usuário, bio, senha e listagem de usuários bloqueados.
 *
 * Cada seção da página (avatar, nome, bio, senha, bloqueados) é
 * independente e só é ativada se os elementos correspondentes existirem
 * no HTML, o que facilita reorganizar a página de configurações sem
 * quebrar o script.
 */

document.addEventListener("DOMContentLoaded", () => {
    const AVATAR_PADRAO = "/static/images/default_avatar.png";

    // Monta a URL correta da foto de perfil: usa o avatar padrão quando
    // o usuário nunca fez upload de uma foto própria.
    function urlAvatar(foto) {
        return (!foto || foto === "default.png") ? AVATAR_PADRAO : `/uploads/avatars/${foto}`;
    }

    // Feedback simples ao usuário. Poderia ser substituído por um
    // componente de toast/notificação mais elaborado no futuro.
    function notificar(mensagem, sucesso = true) {
        alert(mensagem);
    }

    // ------------------------------------------------------------------
    // Avatar: clique no botão abre o seletor de arquivo escondido;
    // ao escolher uma imagem, ela é enviada via FormData (multipart)
    // para a rota de upload, e a prévia na tela é atualizada na hora.
    // ------------------------------------------------------------------
    const btnTrocarFoto = document.getElementById("btn-trocar-foto");
    const inputAvatar = document.getElementById("input-avatar");
    const previewAvatar = document.getElementById("preview-avatar");

    if (btnTrocarFoto) {
        btnTrocarFoto.addEventListener("click", () => inputAvatar.click());
        inputAvatar.addEventListener("change", async () => {
            const arquivo = inputAvatar.files[0];
            if (!arquivo) return;

            const formData = new FormData();
            formData.append("arquivo", arquivo);

            try {
                const resp = await fetch("/api/upload/avatar", { method: "POST", body: formData });
                const dados = await resp.json();
                if (dados.erro) { notificar(dados.erro, false); return; }
                previewAvatar.src = urlAvatar(dados.foto_perfil);
                notificar("Foto de perfil atualizada com sucesso!");
            } catch (e) {
                console.error(e);
            }
        });
    }

    // ------------------------------------------------------------------
    // Nome de usuário: valida no backend (unicidade e tamanho) e apenas
    // exibe o resultado — a sessão do usuário já é atualizada no servidor.
    // ------------------------------------------------------------------
    const btnSalvarNome = document.getElementById("btn-salvar-nome");
    if (btnSalvarNome) {
        btnSalvarNome.addEventListener("click", async () => {
            const nomeUsuario = document.getElementById("input-novo-nome").value.trim();
            try {
                const resp = await fetch("/api/configuracoes/nome-usuario", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nome_usuario: nomeUsuario }),
                });
                const dados = await resp.json();
                if (dados.erro) { notificar(dados.erro, false); return; }
                notificar("Nome de usuário atualizado com sucesso!");
            } catch (e) {
                console.error(e);
            }
        });
    }

    // ------------------------------------------------------------------
    // Bio: texto livre curto exibido no perfil do usuário.
    // ------------------------------------------------------------------
    const btnSalvarBio = document.getElementById("btn-salvar-bio");
    if (btnSalvarBio) {
        btnSalvarBio.addEventListener("click", async () => {
            const bio = document.getElementById("input-bio").value.trim();
            try {
                const resp = await fetch("/api/configuracoes/bio", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ bio }),
                });
                const dados = await resp.json();
                if (dados.erro) { notificar(dados.erro, false); return; }
                notificar("Bio atualizada com sucesso!");
            } catch (e) {
                console.error(e);
            }
        });
    }

    // ------------------------------------------------------------------
    // Senha: exige a senha atual (revalidada no backend) e confirmação
    // da nova senha antes de trocar. Os campos são limpos após o sucesso
    // por segurança (evita deixar a senha visível/preenchida na tela).
    // ------------------------------------------------------------------
    const btnSalvarSenha = document.getElementById("btn-salvar-senha");
    if (btnSalvarSenha) {
        btnSalvarSenha.addEventListener("click", async () => {
            const senhaAtual = document.getElementById("input-senha-atual").value;
            const novaSenha = document.getElementById("input-nova-senha").value;
            const confirmarSenha = document.getElementById("input-confirmar-senha").value;

            try {
                const resp = await fetch("/api/configuracoes/senha", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        senha_atual: senhaAtual,
                        nova_senha: novaSenha,
                        confirmar_senha: confirmarSenha,
                    }),
                });
                const dados = await resp.json();
                if (dados.erro) { notificar(dados.erro, false); return; }
                notificar(dados.mensagem || "Senha alterada com sucesso!");

                // Limpa os campos de senha após o sucesso
                document.getElementById("input-senha-atual").value = "";
                document.getElementById("input-nova-senha").value = "";
                document.getElementById("input-confirmar-senha").value = "";
            } catch (e) {
                console.error(e);
            }
        });
    }

    // ------------------------------------------------------------------
    // Usuários bloqueados: carrega a lista assim que a página abre e
    // permite desbloquear diretamente por aqui, recarregando a lista
    // em seguida para refletir a mudança.
    // ------------------------------------------------------------------
    async function carregarBloqueados() {
        const container = document.getElementById("lista-bloqueados-config");
        if (!container) return;

        try {
            const resp = await fetch("/api/usuarios/bloqueados");
            const usuarios = await resp.json();
            container.innerHTML = "";

            if (!usuarios.length) {
                container.innerHTML = `<p class="texto-ajuda">Você não bloqueou nenhum usuário.</p>`;
                return;
            }

            // Monta um item de lista simples para cada usuário bloqueado,
            // com botão de desbloqueio individual.
            usuarios.forEach((u) => {
                const item = document.createElement("div");
                item.className = "item-lista-simples";
                item.innerHTML = `
                    <img src="${urlAvatar(u.foto_perfil)}" class="avatar avatar-sm" alt="">
                    <div class="info"><strong>${u.nome_usuario}</strong></div>
                    <button class="btn btn-secundario" style="padding:6px 12px;">Desbloquear</button>
                `;
                item.querySelector("button").addEventListener("click", async () => {
                    await fetch(`/api/usuarios/${u.id}/desbloquear`, { method: "POST" });
                    // Recarrega a lista para remover o usuário desbloqueado
                    carregarBloqueados();
                });
                container.appendChild(item);
            });
        } catch (e) {
            console.error(e);
        }
    }

    carregarBloqueados();
});
