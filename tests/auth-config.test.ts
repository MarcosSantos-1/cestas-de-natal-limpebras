import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
test("credenciais ausentes não são apresentadas como sessão expirada", () => {
  const script = `const m=await import('./src/server/service.ts');const service=m.default||m;try{await service.requireAdmin('test-token');process.exit(1);}catch(e){console.log(e.message);}`;
  const result = execFileSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      script,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        FIRESTORE_EMULATOR_HOST: "",
        FIREBASE_AUTH_EMULATOR_HOST: "",
        FIREBASE_CLIENT_EMAIL: "",
        FIREBASE_PRIVATE_KEY: "",
        GOOGLE_APPLICATION_CREDENTIALS: "",
      },
    },
  );
  assert.match(result, /CONFIG: Credenciais privadas do Firebase ausentes/);
  assert.doesNotMatch(result, /sessão expirou/);
});
