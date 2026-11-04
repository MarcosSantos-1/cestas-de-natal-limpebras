import { test } from "node:test";
import assert from "node:assert/strict";
import { api } from "../src/lib/api-client";
test("API conserva a resposta JSON e a mensagem autorizada pelo servidor", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );
  assert.deepEqual(await api("admin.me"), { ok: true });
  t.mock.restoreAll();
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({ error: "Esta conta não tem acesso ao RH." }),
        { status: 403 },
      ),
  );
  await assert.rejects(api("admin.me"), /Esta conta não tem acesso ao RH/);
});
test("API trata corpo vazio ou HTML de erro sem expor o corpo nem erros de JSON", async (t) => {
  for (const raw of [
    "",
    "<html>Internal diagnostic secret</html>",
    "{",
    "null",
  ]) {
    t.mock.restoreAll();
    t.mock.method(
      globalThis,
      "fetch",
      async () => new Response(raw, { status: 500 }),
    );
    await assert.rejects(api("admin.me"), (error) => {
      assert.match((error as Error).message, /HTTP 500/);
      assert.doesNotMatch(
        (error as Error).message,
        /JSON|secret|Unexpected|pattern/,
      );
      return true;
    });
  }
});
test("falha de rede usa mensagem compreensível em qualquer navegador", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new SyntaxError("The string did not match the expected pattern");
  });
  await assert.rejects(
    api("admin.me"),
    /Não foi possível conectar ao servidor/,
  );
});
