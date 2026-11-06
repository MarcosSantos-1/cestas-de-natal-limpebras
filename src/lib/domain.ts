export type Admin = {
  uid: string;
  name: string;
  employeeId: string;
  active: boolean;
  email?: string | null;
};
export type Delivery = {
  at: string;
  code: string;
  operatorName: string;
  operatorEmployeeId: string;
  operatorUid: string;
};
export type Employee = {
  id: string;
  name: string;
  cpf: string;
  employeeId: string;
  active: boolean;
  inactivatedAt: string | null;
  code: string | null;
  scheduledDate: string | null;
  delivery: Delivery | null;
  updatedAt: string;
};
export const employeeFilters = {
  all: "Todos",
  pending: "Pendentes",
  scheduled: "Agendados",
  inactive: "Inativos",
  delivered: "Retirados",
} as const;
export type EmployeeFilter = keyof typeof employeeFilters;
export type PublicEmployee = Pick<
  Employee,
  "name" | "active" | "code" | "scheduledDate" | "delivery"
>;
export type ImportRow = {
  name: string;
  cpf: string;
  employeeId: string;
  /** null: a planilha não informa Status; preserve a situação existente. */
  active: boolean | null;
};
export const SYLLABLES = [
  "BA",
  "BE",
  "BI",
  "BO",
  "CA",
  "CE",
  "DA",
  "DE",
  "DI",
  "DO",
  "FA",
  "FE",
  "FI",
  "FO",
  "GA",
  "GE",
  "GI",
  "GO",
  "LA",
  "LE",
  "LI",
  "LO",
  "MA",
  "ME",
  "MI",
  "MO",
  "NA",
  "NE",
  "NI",
  "NO",
  "PA",
  "PE",
  "PI",
  "PO",
  "RA",
  "RE",
  "RI",
  "RO",
  "SA",
  "SE",
  "SI",
  "SO",
  "TA",
  "TE",
  "TI",
  "TO",
  "VA",
  "VE",
  "VI",
  "VO",
] as const;
export const normalizeName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
const nameParticles = new Set(["da", "das", "de", "do", "dos", "e"]);
function normalizeFullName(name: string) {
  return normalizeName(name)
    .replace(/['’]/g, "")
    .split(/[\s\p{Pd}]+/u)
    .filter(Boolean)
    .filter(
      (part, index, parts) =>
        index === 0 || index === parts.length - 1 || !nameParticles.has(part),
    )
    .join(" ");
}
export function matchesFullName(input: string, registeredName: string) {
  const name = normalizeFullName(input);
  return name !== "" && name === normalizeFullName(registeredName);
}
export const digits = (s: string) => s.replace(/\D/g, "");
export function validCpf(value: string) {
  const cpf = digits(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let n = 9; n <= 10; n++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Number(cpf[i]) * (n + 1 - i);
    if (((sum * 10) % 11) % 10 !== Number(cpf[n])) return false;
  }
  return true;
}
export const formatCpf = (cpf: string) =>
  digits(cpf)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
export const maskCpf = (cpf: string) =>
  `***.${digits(cpf).slice(3, 6)}.${digits(cpf).slice(6, 9)}-**`;
export const formatDateTime = (s: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(s));
export const formatDay = (s: string) => s.split("-").reverse().join("/");
export const todayBrazil = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function validSchedule(
  date: string,
  start: string,
  end: string,
  today = todayBrazil(),
) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date &&
    date >= today &&
    date >= start &&
    date <= end
  );
}
export function normalizeCode(value: string) {
  const s = value
    .trim()
    .toUpperCase()
    .replace(/^CESTA:/, "")
    .replace(/\s/g, "");
  return /^([A-Z]{2})-?(\d{4})$/.test(s)
    ? s.replace(/^([A-Z]{2})-?(\d{4})$/, "$1-$2")
    : "";
}
export function formatCodeInput(value: string) {
  const code = value.toUpperCase().replace(/[\s-]/g, "");
  if (!/^(?:[A-Z]{0,2}|[A-Z]{2}\d{1,4})$/.test(code)) return null;
  return code.replace(/^([A-Z]{2})(\d)/, "$1-$2");
}
export function shortName(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length <= 2) return words.join(" ");
  return `${words[0]} ${words
    .slice(1, -1)
    .filter(
      (w) => !["de", "da", "do", "dos", "das", "e"].includes(w.toLowerCase()),
    )
    .map((w) => `${w[0]}.`)
    .join(" ")} ${words.at(-1)}`.replace(/\s+/g, " ");
}
export const validPickupDate = (date: string, today = todayBrazil()) =>
  validSchedule(date, today, "9999-12-31", today);
export function publicView(e: Employee): PublicEmployee {
  return {
    name: e.name,
    active: e.active,
    code: e.code,
    scheduledDate: e.scheduledDate,
    delivery: e.delivery ? { ...e.delivery, operatorUid: "" } : null,
  };
}
