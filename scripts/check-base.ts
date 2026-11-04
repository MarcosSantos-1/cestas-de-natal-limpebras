import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { readSpreadsheet } from "../src/lib/spreadsheet";
async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Informe o caminho da planilha.");
  const data = await readFile(path);
  const result = await readSpreadsheet(new File([data], basename(path)));
  // Somente totais, sem nomes, CPFs ou matrículas nos logs.
  console.log(
    JSON.stringify(
      {
        validRows: result.rows.length,
        invalidRows: result.errors.length,
        statusProvided: result.rows.some((row) => row.active !== null),
        errors: result.errors.slice(0, 8),
      },
      null,
      2,
    ),
  );
}
void main();
