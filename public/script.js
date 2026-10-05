// script.js
// O navegador só envia o número e o token do Google.
// O desenho (e a assinatura com o e-mail) é gerado no servidor.

const CLIENT_ID = "756921401249-fu79bg0k3crvnlo6p8u08nr5ackqqpdq.apps.googleusercontent.com";

const formulario = document.getElementById("formulario");
const campoNumero = document.getElementById("numero");
const area = document.getElementById("desenho");
const mensagem = document.getElementById("mensagem");
const botaoBaixar = document.getElementById("baixar");

let svgAtual = "";
let idToken = null;

function aoLogar(resposta) {
  idToken = resposta.credential;
  mensagem.textContent = "Login realizado. Digite um número e clique em Desenhar.";
}

function iniciarGoogle() {
  google.accounts.id.initialize({ client_id: CLIENT_ID, callback: aoLogar });
  google.accounts.id.renderButton(document.getElementById("botao-google"), {
    theme: "outline",
    size: "large",
  });
}
window.addEventListener("load", iniciarGoogle);

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagem.textContent = "";

  const numero = Number(campoNumero.value);
  const cabecalhos = { "Content-Type": "application/json" };
  if (idToken) {
    cabecalhos["Authorization"] = "Bearer " + idToken;
  }

  try {
    const resposta = await fetch("/api/desenho", {
      method: "POST",
      headers: cabecalhos,
      body: JSON.stringify({ numero }),
    });

    if (resposta.status === 400) {
      mensagem.textContent = "Erro 400: digite um número inteiro entre 1 e 100.";
      return;
    }
    if (resposta.status === 401) {
      idToken = null;
      mensagem.textContent =
        "Erro 401: faça login com o Google (a sessão pode ter expirado).";
      return;
    }
    if (!resposta.ok) {
      mensagem.textContent = "Erro " + resposta.status + " ao gerar o desenho.";
      return;
    }

    svgAtual = await resposta.text();
    area.innerHTML = svgAtual;
    botaoBaixar.hidden = false;
  } catch {
    mensagem.textContent = "Falha de rede ao chamar o servidor.";
  }
});

botaoBaixar.addEventListener("click", () => {
  const arquivo = new Blob([svgAtual], { type: "image/svg+xml" });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = "exemplo.svg";
  link.click();
  URL.revokeObjectURL(url);
});