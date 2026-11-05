import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shortName,
  validPickupDate,
  validCpf,
  normalizeName,
  normalizeCode,
  validSchedule,
  SYLLABLES,
  formatDateTime,
} from "../src/lib/domain";
test("agenda livre não depende de janela da campanha e recusa datas passadas", () => {
  assert.equal(validPickupDate("2027-04-25", "2026-11-04"), true);
  assert.equal(validPickupDate("2026-11-04", "2026-11-04"), true);
  assert.equal(validPickupDate("2026-11-03", "2026-11-04"), false);
  assert.equal(validPickupDate("2027-02-30", "2026-11-04"), false);
});
test("nome do conferidor preserva primeiro e último nomes e abrevia os intermediários", () => {
  assert.equal(
    shortName("Marcos Vinicius Silva dos Santos"),
    "Marcos V. S. Santos",
  );
  assert.equal(shortName("Marcos Vinicius"), "Marcos Vinicius");
});
test("CPF valida os dois verificadores e recusa repetições", () => {
  assert.equal(validCpf("529.982.247-25"), true);
  assert.equal(validCpf("11111111111"), false);
  assert.equal(validCpf("52998224724"), false);
  assert.equal(validCpf("123"), false);
});
test("nome é normalizado sem remover partes", () => {
  assert.equal(normalizeName("  JOÃO   da Silva "), "joao da silva");
  assert.notEqual(normalizeName("João Silva"), normalizeName("João da Silva"));
});
test("códigos e QR são normalizados sem aceitar dados extras", () => {
  assert.equal(normalizeCode("cesta:la-0025"), "LA-0025");
  assert.equal(normalizeCode("la0025"), "LA-0025");
  assert.equal(normalizeCode("https://site/LA-0025"), "");
  assert.equal(
    SYLLABLES.some((s) => String(s) === "CU"),
    false,
  );
  assert.equal(new Set(SYLLABLES).size, SYLLABLES.length);
});
test("agenda aceita somente dias reais dentro do período", () => {
  assert.equal(
    validSchedule("2026-12-05", "2026-12-01", "2026-12-23", "2026-11-04"),
    true,
  );
  assert.equal(
    validSchedule("2026-02-30", "2026-01-01", "2026-12-23", "2026-01-01"),
    false,
  );
  assert.equal(
    validSchedule("2026-11-03", "2026-11-01", "2026-12-23", "2026-11-04"),
    false,
  );
  assert.equal(
    validSchedule("2026-12-24", "2026-12-01", "2026-12-23", "2026-11-04"),
    false,
  );
});
test("horário brasileiro usa São Paulo, independentemente do servidor", () => {
  assert.equal(formatDateTime("2026-12-10T15:30:00.000Z"), "10/12/2026, 12:30");
});
