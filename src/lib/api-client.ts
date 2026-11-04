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
  const res = await fetch("/api/operation", {
    method: "POST",
    headers,
    body: JSON.stringify({ action, ...payload }),
    cache: "no-store",
  });
  const body = await res.json();
  if (!res.ok)
    throw new Error(
      body.error || "Não foi possível concluir. Tente novamente.",
    );
  return body as T;
}
