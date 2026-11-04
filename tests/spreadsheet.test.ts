import { test } from "node:test";
import assert from "node:assert/strict";
import { readSpreadsheet } from "../src/lib/spreadsheet";
test("formato Matrícula/Nome/CPF conserva a ausência de Status", async () => {
  const file = new File(
    ["Matricula;Nome;CPF\n2550;João da Silva;52998224725"],
    "base.csv",
  );
  const result = await readSpreadsheet(file);
  assert.equal(result.errors.length, 0);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].active, null);
  assert.equal(result.rows[0].employeeId, "2550");
  assert.ok(!("unit" in result.rows[0]));
});
test("status opcional é validado quando presente e CPFs duplicados são recusados", async () => {
  const file = new File(
    [
      "Matricula;Nome;CPF;Status\n2550;João da Silva;52998224725;Inativo\n2551;Outro nome;52998224725;Ativo\n2552;Maria de Souza;11144477735;Indefinido",
    ],
    "base.csv",
  );
  const result = await readSpreadsheet(file);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].active, false);
  assert.equal(result.errors.length, 2);
});
