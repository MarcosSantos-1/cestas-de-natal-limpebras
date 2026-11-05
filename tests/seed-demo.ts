import { authentication, database } from "../src/server/firebase";
import { campaign, importEmployees } from "../src/server/service";
async function main() {
  if (
    !process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.FIREBASE_PROJECT_ID !== "demo-cestas"
  )
    throw new Error("Seed permitido somente nos emuladores demo-cestas.");
  const uid = "demo-admin";
  try {
    await authentication().getUser(uid);
  } catch {
    await authentication().createUser({
      uid,
      email: "rh@example.test",
      password: "TesteLocal123!",
      displayName: "Marcos Vinicius",
    });
  }
  if (process.env.CAMPAIGN_ID !== "browser-tests")
    throw new Error("Seed reservado à campanha browser-tests.");
  await database().recursiveDelete(campaign());
  try {
    const fixture = await authentication().getUserByEmail(
      "98765@rh.cestas.limpebras.local",
    );
    await database().collection("admins").doc(fixture.uid).delete();
    await authentication().deleteUser(fixture.uid);
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found")
      throw error;
  }
  const admin = {
    uid,
    name: "Marcos Vinicius de Almeida dos Santos",
    employeeId: "2550",
    active: true,
  };
  await database().collection("admins").doc(uid).set(admin);
  await importEmployees(
    [
      {
        name: "João da Silva",
        cpf: "52998224725",
        employeeId: "1001",
        active: true,
      },
      {
        name: "Maria de Souza",
        cpf: "11144477735",
        employeeId: "1002",
        active: true,
      },
      {
        name: "Ana Oliveira",
        cpf: "39053344705",
        employeeId: "1003",
        active: false,
      },
    ],
    admin,
  );
  console.log(
    "Dados fictícios criados somente no emulador. Login local: rh@example.test / TesteLocal123!",
  );
  await database().terminate();
}
void main();
