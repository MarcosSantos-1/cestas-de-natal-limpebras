import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/operation/route";
import { database, authentication } from "../src/server/firebase";
import {
  adminOperation,
  campaign,
  employeeKey,
  importEmployees,
  publicOperation,
  requireAdmin,
} from "../src/server/service";
import type { Admin, Employee, PublicEmployee } from "../src/lib/domain";

test("fluxo real nos emuladores: autorização, pedidos, concorrência, importação e revogação", async () => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST,
    "Execute usando emulators:exec; nenhum teste usa produção.",
  );
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  process.env.FIREBASE_PROJECT_ID = "demo-cestas";
  process.env.EMPLOYEE_LOOKUP_SECRET =
    "local-integration-secret-with-more-than-32-chars";
  process.env.CAMPAIGN_ID = `test-${Date.now()}`;
  process.env.PICKUP_START_DATE = "2026-01-01";
  process.env.PICKUP_END_DATE = "2099-12-31";
  const user = await authentication().createUser({
    email: `root-${Date.now()}@example.test`,
    password: "Testing12345!",
  });
  process.env.BOOTSTRAP_ADMIN_UID = user.uid;
  process.env.BOOTSTRAP_ADMIN_NAME = "Marcos Vinicius";
  process.env.BOOTSTRAP_ADMIN_EMPLOYEE_ID = "2550";
  const authResponse = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        password: "Testing12345!",
        returnSecureToken: true,
      }),
    },
  );
  const { idToken } = await authResponse.json();
  assert.ok(idToken);
  const actor = await requireAdmin(idToken);
  assert.equal(actor.employeeId, "2550");
  const anon = await POST(
    new NextRequest("http://localhost:3000/api/operation", {
      method: "POST",
      body: JSON.stringify({ action: "admin.list" }),
    }),
  );
  assert.equal(anon.status, 401);
  const deniedOrigin = await POST(
    new NextRequest("http://localhost:3000/api/operation", {
      method: "POST",
      headers: { Origin: "https://evil.example" },
      body: JSON.stringify({ action: "admin.list" }),
    }),
  );
  assert.equal(deniedOrigin.status, 403);
  const row = {
    name: "João da Silva",
    cpf: "52998224725",
    active: true,
    employeeId: "1001",
  };
  await importEmployees([{ ...row, active: null }], actor);
  const noMatch = await POST(
    new NextRequest("http://localhost:3000/api/operation", {
      method: "POST",
      body: JSON.stringify({
        action: "public.lookup",
        name: "Outra pessoa",
        cpf: row.cpf,
      }),
    }),
  );
  assert.equal(noMatch.status, 404);
  const identity = { name: row.name, cpf: row.cpf };
  const requested = await publicOperation("public.request", {
    ...identity,
    mode: "now",
  });
  assert.match(requested.code!, /^[A-Z]{2}-\d{4}$/);
  assert.ok(!requested.code!.startsWith("CU"));
  const repeated = await publicOperation("public.request", {
    ...identity,
    mode: "now",
  });
  assert.equal(repeated.code, requested.code);
  await publicOperation("public.cancel", identity);
  await assert.rejects(
    adminOperation("admin.lookup", { code: requested.code }, actor),
    /cancelado/,
  );
  const scheduled = await publicOperation("public.request", {
    ...identity,
    mode: "schedule",
    date: "2099-12-10",
  });
  assert.equal(scheduled.scheduledDate, "2099-12-10");
  assert.notEqual(scheduled.code, requested.code);
  await adminOperation(
    "admin.status",
    { id: employeeKey(row.cpf), active: false },
    actor,
  );
  await assert.rejects(
    adminOperation("admin.deliver", { code: scheduled.code }, actor),
    /inativo/,
  );
  await adminOperation(
    "admin.status",
    { id: employeeKey(row.cpf), active: true },
    actor,
  );
  const concurrent = await Promise.allSettled([
    adminOperation("admin.deliver", { code: scheduled.code }, actor),
    adminOperation("admin.deliver", { code: scheduled.code }, actor),
  ]);
  assert.equal(concurrent.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(concurrent.filter((r) => r.status === "rejected").length, 1);
  const delivered = await publicOperation("public.lookup", identity);
  assert.equal(delivered.delivery?.operatorName, "Marcos Vinicius");
  assert.equal(delivered.delivery?.operatorEmployeeId, "2550");
  assert.equal(delivered.delivery?.operatorUid, "");
  await assert.rejects(
    publicOperation("public.cancel", identity),
    /já foi entregue/,
  );
  await importEmployees(
    [{ ...row, name: "Nome alterado na planilha", active: false }],
    actor,
  );
  const preserved = (
    await campaign().collection("employees").doc(employeeKey(row.cpf)).get()
  ).data() as Employee;
  assert.equal(preserved.name, row.name);
  assert.equal(preserved.delivery?.code, scheduled.code);
  assert.equal(preserved.active, false);
  assert.ok(preserved.inactivatedAt);
  await importEmployees([{ ...row, active: null }], actor);
  const noStatus = (
    await campaign().collection("employees").doc(employeeKey(row.cpf)).get()
  ).data()!;
  assert.equal(noStatus.active, false);
  assert.equal(noStatus.delivery.code, scheduled.code);
  const result = (await adminOperation(
    "admin.list",
    { query: "joao" },
    actor,
  )) as { items: Employee[] };
  assert.equal(result.items.length, 1);
  const cpfResult = (await adminOperation(
    "admin.list",
    { query: row.cpf },
    actor,
  )) as { items: Employee[] };
  assert.equal(cpfResult.items.length, 1);
  const employeeIdResult = (await adminOperation(
    "admin.list",
    { query: "1001" },
    actor,
  )) as { items: Employee[] };
  assert.equal(employeeIdResult.items.length, 1);
  assert.equal(employeeIdResult.items[0].cpf, row.cpf);
  const stats = (await adminOperation("admin.stats", {}, actor)) as {
    total: number;
    delivered: number;
  };
  assert.equal(stats.total, 1);
  assert.equal(stats.delivered, 1);
  const audit = await campaign()
    .collection("audit")
    .where("action", "==", "delivery.confirm")
    .get();
  assert.equal(audit.size, 1);
  const child = (await adminOperation(
    "admin.createAdmin",
    {
      name: "Maria Conferente",
      employeeId: "8888",
      password: "TestPassword123!",
      confirmPassword: "TestPassword123!",
    },
    actor,
  )) as Admin;
  assert.ok(child.uid);
  const accesses = (await adminOperation("admin.admins", {}, actor)) as Admin[];
  assert.equal(accesses.find((a) => a.uid === user.uid)?.email, user.email);
  assert.equal(
    accesses.find((a) => a.uid === child.uid)?.email,
    "8888@rh.cestas.limpebras.local",
  );
  await adminOperation("admin.disableAdmin", { uid: child.uid }, actor);
  assert.equal(
    (await database().collection("admins").doc(child.uid).get()).data()?.active,
    false,
  );
  const response = await POST(
    new NextRequest("http://localhost:3000/api/operation", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ action: "admin.list" }),
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
  const direct = await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/demo-cestas/databases/(default)/documents/campaigns/${process.env.CAMPAIGN_ID}/employees/${employeeKey(row.cpf)}`,
  );
  assert.equal(direct.status, 403);
  const outsider = await authentication().createUser({
    email: `outsider-${Date.now()}@example.test`,
    password: "Testing12345!",
  });
  const outLogin = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: outsider.email,
        password: "Testing12345!",
        returnSecureToken: true,
      }),
    },
  );
  const outToken = (await outLogin.json()).idToken;
  await assert.rejects(requireAdmin(outToken), /não tem acesso/);
  // Limpeza só dentro do projeto demo e da campanha isolada criada pelo teste.
  await database().recursiveDelete(campaign());
  await database().collection("admins").doc(user.uid).delete();
  await database().collection("admins").doc(child.uid).delete();
  await authentication().deleteUser(child.uid);
  await authentication().deleteUser(user.uid);
  await authentication().deleteUser(outsider.uid);
  await database().terminate();
});
