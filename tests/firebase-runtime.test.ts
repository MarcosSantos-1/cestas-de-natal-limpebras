import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
test("Firebase Admin inicia sem depender de require(ESM), como no runtime da Vercel", () => {
  const script = `
 const assert=require('node:assert/strict');
 require('firebase-admin/app-check');require('firebase-admin/auth');
 const {generateKeyPairSync}=require('node:crypto');
 const {publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const jwk={...publicKey.export({format:'jwk'}),kid:'regression',alg:'RS256',use:'sig'};
 const client=require('jwks-rsa')({jwksUri:'https://unused.example.test',getKeysInterceptor:()=>Promise.resolve([jwk])});
 client.getSigningKey('regression').then(key=>{assert.match(key.getPublicKey(),/BEGIN PUBLIC KEY/);console.log('ok');}).catch(()=>process.exit(1));
 `;
  assert.equal(
    execFileSync(
      process.execPath,
      ["--no-experimental-require-module", "-e", script],
      { encoding: "utf8" },
    ).trim(),
    "ok",
  );
});
