export async function api<T>(
  action: string,
  payload: Record<string, unknown> = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (
    action.startsWith("public.") &&
    process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY
  ) {
    const { appCheckToken } = await import("./app-check");
    const check = await appCheckToken();
    if (check) headers["X-Firebase-AppCheck"] = check;
  }
  let res: Response;
  try {
    res = await fetch("/api/operation", {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...payload }),
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Não foi possível conectar ao servidor. Confira a conexão e tente novamente.",
    );
  }
  // A plataforma pode responder HTML ou um corpo vazio quando a função não inicia.
  // Nunca exiba o corpo bruto, que pode conter detalhes internos do servidor.
  const invalidResponse = `O servidor não respondeu corretamente (HTTP ${res.status}). Tente novamente; se continuar, avise o RH.`;
  let body: unknown;
  try {
    body = JSON.parse(await res.text());
  } catch {
    throw new Error(invalidResponse);
  }
  if (body === null || typeof body !== "object")
    throw new Error(invalidResponse);
  if (!res.ok)
    throw new Error(
      "error" in body && typeof body.error === "string"
        ? body.error
        : invalidResponse,
    );
  return body as T;
}
