import { NextRequest, NextResponse } from "next/server";
import {
  AppError,
  adminOperation,
  publicOperation,
  rateLimit,
  requireAdmin,
  verifyAppCheck,
} from "@/server/service";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "no-store, private" };
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      throw new AppError("Origem não permitida.", 403);
    if (Number(request.headers.get("content-length") || 0) > 150_000)
      throw new AppError("Lote muito grande.", 413);
    const raw = await request.text();
    if (raw.length > 150_000) throw new AppError("Lote muito grande.", 413);
    let input;
    try {
      input = JSON.parse(raw);
    } catch {
      throw new AppError("Solicitação inválida.");
    }
    if (!input || typeof input !== "object" || typeof input.action !== "string")
      throw new AppError("Solicitação inválida.");
    let result;
    if (input.action.startsWith("public.")) {
      await verifyAppCheck(request.headers.get("X-Firebase-AppCheck"));
      const ip =
        request.headers.get("x-vercel-forwarded-for") ||
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        "local";
      // Limite alto por IP para redes corporativas compartilhadas; limite menor por CPF.
      await rateLimit(`public:${ip}`, 3200, 300, 32);
      if (typeof input.cpf === "string")
        await rateLimit(`cpf:${input.cpf.replace(/\D/g, "")}`, 30, 300);
      result = await publicOperation(input.action, input);
    } else {
      const actor = await requireAdmin(
        request.headers.get("authorization")?.replace(/^Bearer /, "") || "",
      );
      await rateLimit(`admin:${actor.uid}`, 600, 300);
      result = await adminOperation(input.action, input, actor);
    }
    return NextResponse.json(result, { headers });
  } catch (error) {
    if (error instanceof AppError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers },
      );
    console.error(
      "operation_failed",
      error instanceof Error ? error.name : "UnknownError",
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "",
    );
    const configuration =
      error instanceof Error && error.message.startsWith("CONFIG:");
    return NextResponse.json(
      {
        error: configuration
          ? "O sistema ainda está sendo configurado. Procure o RH."
          : "Não foi possível concluir agora. Tente novamente.",
      },
      { status: 503, headers },
    );
  }
}
