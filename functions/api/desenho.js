import { gerarDesenho, numeroValido } from "../../lib/desenho.js";

function erro(status, mensagem) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  // 1) Método (405)
  if (request.method !== "POST") {
    return new Response("Método não permitido", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  // 2) Corpo (400)
  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return erro(400, "Corpo ausente ou JSON inválido.");
  }
  if (corpo === null || typeof corpo !== "object" || !("numero" in corpo)) {
    return erro(400, "Campo numero ausente.");
  }
  const numero = corpo.numero;
  if (!Number.isInteger(numero) || !numeroValido(numero)) {
    return erro(400, "O numero deve ser um inteiro entre 1 e 100.");
  }

  // 3) Token (401)
  const cabecalho = request.headers.get("Authorization") || "";
  const partes = cabecalho.match(/^Bearer\s+(.+)$/i);
  if (!partes) {
    return erro(401, "Token ausente.");
  }
  const token = partes[1].trim();

  let info;
  try {
    const resp = await fetch(
      "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token)
    );
    if (resp.status !== 200) {
      return erro(401, "Token inválido ou expirado.");
    }
    info = await resp.json();
  } catch {
    return erro(401, "Não foi possível verificar o token.");
  }

  if (!env.GOOGLE_CLIENT_ID || info.aud !== env.GOOGLE_CLIENT_ID) {
    return erro(401, "Token emitido para outro aplicativo.");
  }
  if (String(info.email_verified) !== "true" || !info.email) {
    return erro(401, "E-mail da conta Google não verificado.");
  }

  // 200: o e-mail vem do token, nunca do cliente
  const svg = gerarDesenho(numero, info.email);
  return new Response(svg, {
    status: 200,
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
  });
}