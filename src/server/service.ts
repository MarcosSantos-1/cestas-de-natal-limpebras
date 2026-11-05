import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { FieldPath } from "firebase-admin/firestore";
import { getAppCheck } from "firebase-admin/app-check";
import { database, authentication, serverApp } from "./firebase";
import {
  Admin,
  Employee,
  ImportRow,
  SYLLABLES,
  digits,
  normalizeName,
  normalizeCode,
  publicView,
  validCpf,
  validPickupDate,
} from "../lib/domain";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function secret() {
  const s = process.env.EMPLOYEE_LOOKUP_SECRET;
  if (!s || s.length < 32)
    throw new AppError("Configure o segredo de consulta no servidor.", 503);
  return s;
}
export const employeeKey = (cpf: string) =>
  createHmac("sha256", secret()).update(digits(cpf)).digest("hex");
export const campaign = () =>
  database()
    .collection("campaigns")
    .doc(process.env.CAMPAIGN_ID || "natal-2026");
const employees = () => campaign().collection("employees");
const now = () => new Date().toISOString();
const text = (value: unknown, label: string, max = 160) => {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new AppError(`${label} inválido(a).`);
  return value.trim().replace(/\s+/g, " ");
};
const audit = (
  actor: Admin,
  action: string,
  employeeId: string,
  at: string,
  details = {},
) => ({
  actorUid: actor.uid,
  actorName: actor.name,
  actorEmployeeId: actor.employeeId,
  action,
  employeeId,
  at,
  ...details,
});
export async function requireAdmin(token: string): Promise<Admin> {
  if (!token) throw new AppError("Entre para acessar o painel.", 401);
  // Falhas de configuração não são falhas da sessão do usuário.
  const auth = authentication();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(token, true);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (["auth/id-token-expired", "auth/id-token-revoked"].includes(code)) {
      throw new AppError("Sua sessão expirou. Entre novamente.", 401);
    }
    if (code === "auth/user-disabled")
      throw new AppError("Esta conta foi desativada.", 403);
    if (["auth/argument-error", "auth/invalid-id-token"].includes(code)) {
      throw new AppError(
        "A conta não pôde ser validada. Entre novamente e confira se o aplicativo e o servidor usam o mesmo projeto Firebase.",
        401,
      );
    }
    console.error("admin_verification_failed", code || "unknown");
    throw new AppError(
      "Não foi possível validar o acesso no servidor. Confira as credenciais e permissões do Firebase na Vercel.",
      503,
    );
  }
  const ref = database().collection("admins").doc(decoded.uid);
  const snap = await ref.get();
  if (snap.exists && snap.data()?.active)
    return { ...snap.data(), uid: decoded.uid } as Admin;
  if (!snap.exists && decoded.uid === process.env.BOOTSTRAP_ADMIN_UID) {
    const name = text(
        process.env.BOOTSTRAP_ADMIN_NAME,
        "Nome do administrador",
      ),
      employeeId = text(
        process.env.BOOTSTRAP_ADMIN_EMPLOYEE_ID,
        "Matrícula",
        30,
      );
    const admin = { uid: decoded.uid, name, employeeId, active: true };
    await database().runTransaction(async (tx) => {
      if (!(await tx.get(ref)).exists)
        tx.create(ref, { ...admin, createdAt: now() });
    });
    return admin;
  }
  throw new AppError("Esta conta não tem acesso ao RH.", 403);
}
// Persistente entre instâncias. Armazena apenas hash do identificador de limite.
export async function rateLimit(
  key: string,
  limit: number,
  seconds: number,
  shards = 1,
) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const id = createHmac("sha256", secret())
    .update(`${key}:${bucket}:${randomInt(shards)}`)
    .digest("hex");
  const ref = database().collection("rateLimits").doc(id);
  await database().runTransaction(async (tx) => {
    const count = (await tx.get(ref)).data()?.count || 0;
    if (count >= Math.ceil(limit / shards))
      throw new AppError("Muitas tentativas. Aguarde alguns minutos.", 429);
    tx.set(ref, {
      count: count + 1,
      expiresAt: new Date((bucket + 2) * seconds * 1000),
    });
  });
}
export async function verifyAppCheck(token: string | null) {
  if (process.env.REQUIRE_APP_CHECK !== "true") return;
  if (!token)
    throw new AppError("Atualize a página para validar o acesso.", 403);
  try {
    await getAppCheck(serverApp()).verifyToken(token);
  } catch {
    throw new AppError(
      "Não foi possível validar o acesso. Atualize a página.",
      403,
    );
  }
}
async function identity(input: Record<string, unknown>) {
  const cpf = digits(text(input.cpf, "CPF", 20)),
    name = text(input.name, "Nome");
  if (!validCpf(cpf)) throw new AppError("Confira o CPF informado.");
  const ref = employees().doc(employeeKey(cpf)),
    snap = await ref.get();
  if (!snap.exists || normalizeName(snap.data()!.name) !== normalizeName(name))
    throw new AppError(
      "Dados não encontrados. Confira nome e CPF ou procure o RH.",
      404,
    );
  return { ref, employee: { ...snap.data(), id: snap.id } as Employee, name };
}
export async function publicOperation(
  action: string,
  input: Record<string, unknown>,
) {
  const { ref, employee, name } = await identity(input);
  if (action === "public.lookup") return publicView(employee);
  if (!["public.request", "public.cancel"].includes(action))
    throw new AppError("Operação inválida.");
  const date = typeof input.date === "string" ? input.date : null;
  if (
    action === "public.request" &&
    !["now", "schedule"].includes(String(input.mode))
  )
    throw new AppError("Escolha como retirar.");
  if (
    action === "public.request" &&
    input.mode === "schedule" &&
    (!date || !validPickupDate(date))
  )
    throw new AppError("Escolha uma data válida a partir de hoje.");
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = `${SYLLABLES[randomInt(SYLLABLES.length)]}-${String(randomInt(10000)).padStart(4, "0")}`;
    try {
      return await database().runTransaction(async (tx) => {
        const snap = await tx.get(ref),
          e = { ...snap.data(), id: snap.id } as Employee;
        if (!snap.exists || normalizeName(e.name) !== normalizeName(name))
          throw new AppError("Cadastro alterado. Consulte novamente.", 409);
        if (e.delivery)
          throw new AppError(
            "Esta cesta já foi entregue. Consulte novamente.",
            409,
          );
        if (!e.active)
          throw new AppError("Seu cadastro está inativo. Procure o RH.", 403);
        const at = now();
        if (action === "public.cancel") {
          if (e.code)
            tx.update(campaign().collection("codes").doc(e.code), {
              valid: false,
              cancelledAt: at,
            });
          tx.update(ref, {
            code: null,
            scheduledDate: null,
            hasSchedule: false,
            updatedAt: at,
          });
          tx.create(campaign().collection("audit").doc(), {
            action: "request.cancel",
            employeeId: e.id,
            actor: "public",
            at,
          });
          return publicView({ ...e, code: null, scheduledDate: null });
        }
        if (e.code) return publicView(e);
        const codeRef = campaign().collection("codes").doc(code);
        if ((await tx.get(codeRef)).exists)
          throw new AppError("CODE_COLLISION", 409);
        const scheduledDate = input.mode === "schedule" ? date : null;
        tx.create(codeRef, { employeeId: e.id, valid: true, createdAt: at });
        tx.update(ref, {
          code,
          scheduledDate,
          hasSchedule: !!scheduledDate,
          updatedAt: at,
        });
        tx.create(campaign().collection("audit").doc(), {
          action: "request.create",
          employeeId: e.id,
          actor: "public",
          code,
          scheduledDate,
          at,
        });
        return publicView({ ...e, code, scheduledDate });
      });
    } catch (error) {
      if (error instanceof AppError && error.message === "CODE_COLLISION")
        continue;
      throw error;
    }
  }
  throw new AppError(
    "Não foi possível gerar o código agora. Tente novamente.",
    503,
  );
}
export async function lookupCode(value: unknown) {
  const code = normalizeCode(text(value, "Código", 60));
  if (!code) throw new AppError("Use o formato LA-0025.");
  const snap = await campaign().collection("codes").doc(code).get();
  if (!snap.exists || !snap.data()?.valid)
    throw new AppError("Código não encontrado ou cancelado.", 404);
  const employee = await employees().doc(snap.data()!.employeeId).get();
  if (!employee.exists || employee.data()?.code !== code)
    throw new AppError("Código inválido.", 404);
  return { ...employee.data(), id: employee.id } as Employee;
}
export async function deliver(value: unknown, actor: Admin) {
  const e = await lookupCode(value),
    ref = employees().doc(e.id);
  return database().runTransaction(async (tx) => {
    const [snap, codeSnap, adminSnap] = await Promise.all([
      tx.get(ref),
      tx.get(campaign().collection("codes").doc(e.code!)),
      tx.get(database().collection("admins").doc(actor.uid)),
    ]);
    const current = snap.data() as Employee;
    if (!adminSnap.data()?.active) throw new AppError("Acesso removido.", 403);
    if (!current || !current.active)
      throw new AppError("Colaborador inativo. Entrega bloqueada.", 409);
    if (current.delivery)
      throw new AppError(
        "Esta cesta já foi entregue. Atualize a conferência.",
        409,
      );
    if (current.code !== e.code || !codeSnap.data()?.valid)
      throw new AppError("Pedido cancelado. Leia o novo código.", 409);
    const at = now(),
      delivery = {
        at,
        code: e.code!,
        operatorName: actor.name,
        operatorEmployeeId: actor.employeeId,
        operatorUid: actor.uid,
      };
    tx.update(ref, { delivery, delivered: true, updatedAt: at });
    tx.create(
      campaign().collection("audit").doc(),
      audit(actor, "delivery.confirm", e.id, at, { code: e.code }),
    );
    return { ...current, id: e.id, delivery };
  });
}
export function validateImport(raw: unknown): ImportRow[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 100)
    throw new AppError("Envie de 1 a 100 linhas por lote.");
  const seen = new Set<string>();
  return raw.map((row) => {
    if (!row || typeof row !== "object") throw new AppError("Linha inválida.");
    const name = text(row.name, "Nome"),
      cpf = digits(text(row.cpf, "CPF", 20));
    if (!validCpf(cpf)) throw new AppError(`CPF inválido na linha de ${name}.`);
    if (row.active !== null && typeof row.active !== "boolean")
      throw new AppError(`Status inválido para ${name}.`);
    if (seen.has(cpf)) throw new AppError("Há CPFs repetidos no lote.");
    seen.add(cpf);
    return {
      name,
      cpf,
      active: row.active,
      employeeId: row.employeeId ? text(row.employeeId, "Matrícula", 30) : "",
    };
  });
}
export async function importEmployees(raw: unknown, actor: Admin) {
  const rows = validateImport(raw);
  return database().runTransaction(async (tx) => {
    const refs = rows.map((row) => employees().doc(employeeKey(row.cpf))),
      snaps = await tx.getAll(...refs),
      at = now();
    let added = 0,
      changed = 0;
    rows.forEach((row, i) => {
      const previous = snaps[i].data() as Employee | undefined;
      if (!previous) {
        added++;
        tx.create(refs[i], {
          ...row,
          searchName: normalizeName(row.name),
          id: refs[i].id,
          active: row.active ?? true,
          inactivatedAt: row.active === false ? at : null,
          code: null,
          scheduledDate: null,
          delivery: null,
          delivered: false,
          hasSchedule: false,
          createdAt: at,
          updatedAt: at,
        });
        tx.create(
          campaign().collection("audit").doc(),
          audit(actor, "employee.create", refs[i].id, at, {
            active: row.active ?? true,
          }),
        );
      } else if (row.active !== null && previous.active !== row.active) {
        changed++;
        tx.update(refs[i], {
          active: row.active,
          inactivatedAt: row.active ? previous.inactivatedAt : at,
          updatedAt: at,
        });
        tx.create(
          campaign().collection("audit").doc(),
          audit(actor, "employee.status", refs[i].id, at, {
            before: previous.active,
            after: row.active,
          }),
        );
      }
    });
    return { added, changed, unchanged: rows.length - added - changed };
  });
}
export async function adminOperation(
  action: string,
  input: Record<string, unknown>,
  actor: Admin,
): Promise<unknown> {
  if (action === "admin.me") return actor;
  if (action === "admin.lookup") return lookupCode(input.code);
  if (action === "admin.deliver") return deliver(input.code, actor);
  if (action === "admin.import") return importEmployees(input.rows, actor);
  if (action === "admin.list") {
    const search =
      typeof input.query === "string"
        ? normalizeName(input.query).slice(0, 160)
        : "";
    if (search && /^[\d.\-\s]+$/.test(search)) {
      const numeric = digits(search);
      let byEmployeeId = employees()
        .where("employeeId", "==", numeric)
        .orderBy(FieldPath.documentId())
        .limit(100);
      if (input.cursor)
        byEmployeeId = byEmployeeId.startAfter(
          text(input.cursor, "Cursor", 100),
        );
      const [matches, cpfMatch] = await Promise.all([
        byEmployeeId.get(),
        validCpf(numeric) && !input.cursor
          ? employees().doc(employeeKey(numeric)).get()
          : Promise.resolve(null),
      ]);
      const items = new Map(
        matches.docs.map((doc) => [doc.id, { ...doc.data(), id: doc.id }]),
      );
      if (cpfMatch?.exists)
        items.set(cpfMatch.id, { ...cpfMatch.data(), id: cpfMatch.id });
      return {
        items: [...items.values()],
        cursor: matches.size === 100 ? matches.docs.at(-1)!.id : null,
      };
    }
    let q = search
      ? employees()
          .orderBy("searchName")
          .orderBy(FieldPath.documentId())
          .where("searchName", ">=", search)
          .where("searchName", "<=", search + "\uf8ff")
          .limit(100)
      : employees().orderBy(FieldPath.documentId()).limit(100);
    if (input.cursor) {
      const cursor = text(input.cursor, "Cursor", 1000);
      if (search) {
        let values;
        try {
          values = JSON.parse(Buffer.from(cursor, "base64url").toString());
        } catch {
          throw new AppError("Cursor inválido.");
        }
        if (
          !Array.isArray(values) ||
          values.length !== 2 ||
          !values.every((v) => typeof v === "string")
        )
          throw new AppError("Cursor inválido.");
        q = q.startAfter(...values);
      } else q = q.startAfter(cursor);
    }
    const result = await q.get(),
      last = result.docs.at(-1);
    return {
      items: result.docs.map((d) => ({ ...d.data(), id: d.id })),
      cursor:
        result.size === 100 && last
          ? search
            ? Buffer.from(
                JSON.stringify([last.data().searchName, last.id]),
              ).toString("base64url")
            : last.id
          : null,
    };
  }
  if (action === "admin.stats") {
    const [total, active, delivered, scheduled] = await Promise.all([
      employees().count().get(),
      employees().where("active", "==", true).count().get(),
      employees().where("delivered", "==", true).count().get(),
      employees().where("hasSchedule", "==", true).count().get(),
    ]);
    return {
      total: total.data().count,
      active: active.data().count,
      delivered: delivered.data().count,
      scheduled: scheduled.data().count,
    };
  }
  if (action === "admin.status") {
    const ref = employees().doc(text(input.id, "Cadastro", 100));
    if (typeof input.active !== "boolean")
      throw new AppError("Status inválido.");
    return database().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new AppError("Cadastro não encontrado.", 404);
      const before = snap.data()!,
        at = now();
      tx.update(ref, {
        active: input.active,
        inactivatedAt: input.active ? before.inactivatedAt : at,
        updatedAt: at,
      });
      tx.create(
        campaign().collection("audit").doc(),
        audit(actor, "employee.status", snap.id, at, {
          before: before.active,
          after: input.active,
        }),
      );
      return { ok: true };
    });
  }
  if (action === "admin.admins") {
    const snap = await database().collection("admins").get();
    // Authentication é a fonte do e-mail, inclusive para administradores antigos.
    const emailByUid = new Map<string, string | null>();
    for (let offset = 0; offset < snap.docs.length; offset += 100) {
      const result = await authentication().getUsers(
        snap.docs.slice(offset, offset + 100).map((doc) => ({ uid: doc.id })),
      );
      for (const user of result.users)
        emailByUid.set(user.uid, user.email || null);
    }
    return snap.docs.map((d) => ({
      uid: d.id,
      name: d.data().name,
      employeeId: d.data().employeeId,
      active: d.data().active,
      email: emailByUid.get(d.id) || null,
    }));
  }
  if (action === "admin.createAdmin") {
    const name = text(input.name, "Nome"),
      employeeId = text(input.employeeId, "Matrícula", 30);
    if (!/^\d{1,20}$/.test(employeeId))
      throw new AppError("A matrícula deve conter apenas números.");
    if (
      typeof input.password !== "string" ||
      input.password.length < 10 ||
      input.password.length > 128
    )
      throw new AppError("Use uma senha de 10 a 128 caracteres.");
    if (input.password !== input.confirmPassword)
      throw new AppError("As senhas não conferem.");
    let user;
    try {
      user = await authentication().createUser({
        email: `${employeeId}@rh.cestas.limpebras.local`,
        password: input.password,
        displayName: name,
      });
    } catch (error) {
      if ((error as { code?: string }).code === "auth/email-already-exists")
        throw new AppError("Já existe um acesso para esta matrícula.", 409);
      throw error;
    }
    try {
      const batch = database().batch(),
        at = now();
      batch.create(database().collection("admins").doc(user.uid), {
        name,
        employeeId,
        active: true,
        createdAt: at,
        createdBy: actor.uid,
      });
      batch.create(
        campaign().collection("audit").doc(),
        audit(actor, "admin.create", user.uid, at),
      );
      await batch.commit();
    } catch (error) {
      await authentication().deleteUser(user.uid);
      throw error;
    }
    return { uid: user.uid, name, employeeId, active: true };
  }
  if (action === "admin.disableAdmin") {
    const uid = text(input.uid, "Acesso", 128);
    if (uid === actor.uid || uid === process.env.BOOTSTRAP_ADMIN_UID)
      throw new AppError("Não é possível remover este acesso pelo painel.");
    const batch = database().batch();
    batch.update(database().collection("admins").doc(uid), { active: false });
    batch.create(
      campaign().collection("audit").doc(),
      audit(actor, "admin.disable", uid, now()),
    );
    await batch.commit();
    await authentication().revokeRefreshTokens(uid);
    return { ok: true };
  }
  throw new AppError("Operação desconhecida.");
}
