import {
  ImportRow,
  Employee,
  normalizeName,
  validCpf,
  digits,
  formatDateTime,
} from "./domain";
export type ImportPreview = { rows: ImportRow[]; errors: string[] };
export async function readSpreadsheet(file: File): Promise<ImportPreview> {
  if (file.size > 8 * 1024 * 1024)
    throw new Error("A planilha deve ter até 8 MB.");
  const {
    default: { Workbook },
  } = await import("exceljs");
  const wb = new Workbook();
  if (file.name.toLowerCase().endsWith(".csv")) {
    // CSV com separador vírgula ou ponto e vírgula; aspas e quebras de linha são respeitadas.
    const content = (await file.text()).replace(/^\uFEFF/, "");
    const delimiter = content.split(/\r?\n/)[0].includes(";") ? ";" : ",";
    const sheet = wb.addWorksheet("Colaboradores");
    let row: string[] = [],
      cell = "",
      quoted = false;
    for (let i = 0; i < content.length; i++) {
      const c = content[i];
      if (c === '"') {
        if (quoted && content[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = !quoted;
      } else if (c === delimiter && !quoted) {
        row.push(cell);
        cell = "";
      } else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && content[i + 1] === "\n") i++;
        row.push(cell);
        if (row.some(Boolean)) sheet.addRow(row);
        row = [];
        cell = "";
      } else cell += c;
    }
    if (quoted) throw new Error("CSV com aspas não fechadas.");
    row.push(cell);
    if (row.some(Boolean)) sheet.addRow(row);
  } else if (file.name.toLowerCase().endsWith(".xlsx"))
    await wb.xlsx.load(await file.arrayBuffer());
  else throw new Error("Use um arquivo .xlsx ou .csv.");
  const sheet = wb.worksheets[0];
  if (!sheet || sheet.rowCount < 2)
    throw new Error("Planilha vazia. Use as colunas Matrícula, Nome e CPF.");
  if (sheet.rowCount > 30001)
    throw new Error("Divida a base em planilhas com até 30 mil linhas.");
  const headers = new Map<string, number>();
  sheet
    .getRow(1)
    .eachCell((cell, i) => headers.set(normalizeName(cell.text), i));
  const nameCol = headers.get("nome") || headers.get("nome completo"),
    cpfCol = headers.get("cpf"),
    employeeIdCol = headers.get("matricula"),
    statusCol = headers.get("status");
  if (!nameCol || !cpfCol || !employeeIdCol)
    throw new Error("Colunas obrigatórias: Matrícula, Nome e CPF.");
  const rows: ImportRow[] = [],
    errors: string[] = [],
    seen = new Set<string>();
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    if (!row.hasValues) continue;
    const name = row.getCell(nameCol).text.trim(),
      raw = digits(row.getCell(cpfCol).text),
      cpf = raw.padStart(11, "0"),
      status = statusCol ? normalizeName(row.getCell(statusCol).text) : "";
    if (!name || name.length > 160 || !validCpf(cpf)) {
      errors.push(`Linha ${i}: nome ou CPF inválido.`);
      continue;
    }
    if (statusCol && !["ativo", "inativo"].includes(status)) {
      errors.push(`Linha ${i}: Status deve ser Ativo ou Inativo.`);
      continue;
    }
    if (seen.has(cpf)) {
      errors.push(`Linha ${i}: CPF repetido na planilha.`);
      continue;
    }
    seen.add(cpf);
    const employeeId = row.getCell(employeeIdCol).text.trim();
    if (!employeeId || employeeId.length > 30) {
      errors.push(`Linha ${i}: matrícula inválida.`);
      continue;
    }
    rows.push({
      name,
      cpf,
      employeeId,
      active: statusCol ? status === "ativo" : null,
    });
  }
  return { rows, errors };
}
function download(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadTemplate() {
  download(
    "\uFEFFMatricula;Nome;CPF\r\n",
    "modelo-colaboradores.csv",
    "text/csv;charset=utf-8",
  );
}
export async function exportEmployees(rows: Employee[]) {
  const {
    default: { Workbook },
  } = await import("exceljs");
  const wb = new Workbook(),
    sheet = wb.addWorksheet("Colaboradores");
  sheet.addRow([
    "Nome",
    "CPF",
    "Status",
    "Matrícula",
    "Última inativação",
    "Código",
    "Agendamento",
    "Entregue em",
    "Conferido por",
  ]);
  for (const e of rows)
    sheet.addRow([
      e.name,
      e.cpf,
      e.active ? "Ativo" : "Inativo",
      e.employeeId,
      e.inactivatedAt ? formatDateTime(e.inactivatedAt) : "",
      e.code || "",
      e.scheduledDate || "",
      e.delivery ? formatDateTime(e.delivery.at) : "",
      e.delivery
        ? `${e.delivery.operatorName} (${e.delivery.operatorEmployeeId})`
        : "",
    ]);
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF082759" },
  };
  sheet.columns.forEach((c) => (c.width = 24));
  sheet.getColumn(1).width = 40;
  sheet.getColumn(2).numFmt = "@";
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  download(
    await wb.xlsx.writeBuffer(),
    "cestas-natal.xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
