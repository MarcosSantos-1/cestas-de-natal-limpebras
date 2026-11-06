"use client";
import { useState } from "react";
import { FileTrigger } from "react-aria-components";
import { Button } from "@heroui/react/button";
import { Form } from "@heroui/react/form";
import { Chip } from "@heroui/react/chip";
import { Checkbox } from "@heroui/react/checkbox";
import { ProgressBar } from "@heroui/react/progress-bar";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  FileSpreadsheet,
  ListFilter,
  Plus,
  Search,
  Upload,
  Users,
} from "lucide-react";
import { Confirm, Field, Feedback, Screen, Sheet } from "./ui";
import type { AdminController, ListResult } from "./use-admin";
import {
  Employee,
  EmployeeFilter,
  employeeFilters,
  formatCpf,
  formatDateTime,
  formatDay,
  maskCpf,
  shortName,
} from "@/lib/domain";
import type { ImportPreview } from "@/lib/spreadsheet";
export default function EmployeesScreen({
  controller: c,
}: {
  controller: AdminController;
}) {
  const [search, setSearch] = useState(c.query),
    [filterOpen, setFilterOpen] = useState(false),
    [importOpen, setImportOpen] = useState(false),
    [preview, setPreview] = useState<ImportPreview | null>(null),
    [progress, setProgress] = useState(0),
    [importError, setImportError] = useState(""),
    [selected, setSelected] = useState<Employee | null>(null),
    [confirmStatus, setConfirmStatus] = useState(false),
    [createOpen, setCreateOpen] = useState(false),
    [newCpf, setNewCpf] = useState(""),
    [confirmReverse, setConfirmReverse] = useState(false),
    [bulkMode, setBulkMode] = useState(false),
    [bulkIds, setBulkIds] = useState<string[]>([]),
    [confirmBulk, setConfirmBulk] = useState(false);
  async function readFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setPreview(null);
    setImportError("");
    await c.task(async () => {
      try {
        const { readSpreadsheet } = await import("@/lib/spreadsheet");
        setPreview(await readSpreadsheet(file));
      } catch (e) {
        setImportError((e as Error).message);
      }
    });
  }
  async function importRows() {
    if (!preview || preview.errors.length) return;
    setImportError("");
    await c.task(async () => {
      let done = 0,
        added = 0,
        changed = 0;
      try {
        for (let i = 0; i < preview.rows.length; i += 100) {
          const rows = preview.rows.slice(i, i + 100);
          const result = await c.call<{ added: number; changed: number }>(
            "admin.import",
            { rows },
          );
          done += rows.length;
          added += result.added;
          changed += result.changed;
          setProgress(done);
        }
        await Promise.all([c.loadEmployees(), c.refresh()]);
        setPreview(null);
        setImportOpen(false);
        setProgress(0);
        setSearch("");
        c.setNotice(
          `${added} novos colaboradores. ${changed} status atualizados. Entregas preservadas.`,
        );
      } catch (e) {
        setImportError(
          `${(e as Error).message} ${done} linhas já processadas; você pode reenviar a mesma planilha.`,
        );
      }
    });
  }
  async function exportAll() {
    await c.task(async () => {
      let all: Employee[] = [],
        cursor: string | null = null;
      do {
        const page: ListResult = await c.call("admin.list", { cursor });
        all.push(...page.items);
        cursor = page.cursor;
      } while (cursor);
      const { exportEmployees } = await import("@/lib/spreadsheet");
      await exportEmployees(all);
      c.setNotice("Planilha exportada.");
    });
  }
  return (
    <Screen id="employees" className="people-screen">
      <div className="screen-copy compact-copy">
        <p className="eyebrow">NOSSA EQUIPE</p>
        <h1>
          Uma pessoa.
          <br />
          Uma cesta.
        </h1>
        <p className="screen-description">
          {c.stats
            ? `${c.stats.total.toLocaleString("pt-BR")} colaboradores na campanha`
            : "Base de colaboradores"}
        </p>
      </div>
      <div className="people-actions">
        <Button
          className="add-person-button"
          isIconOnly
          aria-label="Adicionar colaborador"
          isDisabled={c.busy}
          onPress={() => {
            setNewCpf("");
            setCreateOpen(true);
          }}
        >
          <Plus size={22} />
        </Button>
        <Button
          className="primary-button"
          onPress={() => {
            setImportOpen(true);
            setPreview(null);
            setImportError("");
          }}
          isDisabled={c.busy}
        >
          <Upload size={18} />
          Importar
        </Button>
        <Button
          variant="outline"
          onPress={() => void exportAll()}
          isDisabled={c.busy}
        >
          <Download size={18} />
          Exportar Excel
        </Button>
        <Button
          className="desktop-selection"
          variant="outline"
          isDisabled={c.busy}
          onPress={() => {
            setBulkMode(!bulkMode);
            setBulkIds([]);
          }}
        >
          {bulkMode ? "Cancelar seleção" : "Selecionar"}
        </Button>
      </div>
      <Form
        className="people-search"
        onSubmit={(e) => {
          e.preventDefault();
          void c.task(() => c.loadEmployees(search));
        }}
      >
        <Field
          label="Buscar colaborador"
          value={search}
          onChange={setSearch}
          placeholder="Nome, matrícula ou CPF"
          className="search-field"
        />
        <Button
          type="submit"
          variant="outline"
          aria-label="Buscar"
          isDisabled={c.busy}
          isIconOnly
        >
          <Search size={21} />
        </Button>
        <Button
          type="button"
          variant={c.filter === "all" ? "outline" : "primary"}
          aria-label={`Filtrar colaboradores (${employeeFilters[c.filter]})`}
          isDisabled={c.busy}
          isIconOnly
          onPress={() => setFilterOpen(true)}
        >
          <ListFilter size={21} />
        </Button>
      </Form>
      {bulkMode ? (
        <Button
          className="desktop-selection"
          variant="danger"
          isDisabled={c.busy || !bulkIds.length}
          onPress={() => setConfirmBulk(true)}
        >
          Inativar selecionados ({bulkIds.length}/100)
        </Button>
      ) : null}
      <div className="people-list" aria-label="Colaboradores">
        {c.rows.map((e) => (
          <div key={e.id} className="employee-list-item">
            {bulkMode && e.active ? (
              <Checkbox
                className="desktop-selection employee-selection"
                aria-label={`Selecionar ${e.name}, matrícula ${e.employeeId}`}
                isSelected={bulkIds.includes(e.id)}
                isDisabled={
                  c.busy || (bulkIds.length >= 100 && !bulkIds.includes(e.id))
                }
                onChange={(checked) =>
                  setBulkIds((ids) =>
                    checked ? [...ids, e.id] : ids.filter((id) => id !== e.id),
                  )
                }
              >
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox.Content>
              </Checkbox>
            ) : null}
            <Button
              variant="ghost"
              className="employee-row"
              onPress={() => setSelected(e)}
            >
              <span className="person-circle">
                {e.name
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <span className="person-info">
                <strong>{e.name}</strong>
                <span>
                  Mat. {e.employeeId || "—"} · {maskCpf(e.cpf)}
                </span>
                <span className="person-tags">
                  <Chip
                    size="sm"
                    className={e.active ? "plain-chip" : "danger-chip"}
                  >
                    {e.active ? "Ativo" : "Inativo"}
                  </Chip>
                  <Chip
                    size="sm"
                    className={e.delivery ? "solid-chip" : "code-chip"}
                  >
                    {e.delivery
                      ? "Entregue"
                      : e.scheduledDate
                        ? "Agendada"
                        : e.code
                          ? "Código gerado"
                          : "Pendente"}
                  </Chip>
                </span>
              </span>
              <ChevronRight size={19} />
            </Button>
          </div>
        ))}
        {!c.rows.length ? (
          <div className="list-empty">
            <Users size={32} />
            <h2>{c.stats?.total ? "Nenhum resultado." : "Vamos começar?"}</h2>
            <p>
              {c.stats?.total
                ? "Altere a busca ou o filtro."
                : "Importe a planilha de Matrícula, Nome e CPF."}
            </p>
          </div>
        ) : null}
        {c.cursor ? (
          <Button
            variant="outline"
            fullWidth
            onPress={() =>
              void c.task(() => c.loadEmployees(c.query, true, c.cursor))
            }
            isDisabled={c.busy}
          >
            Carregar mais
          </Button>
        ) : null}
      </div>
      <Sheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filtrar colaboradores"
      >
        <div className="access-form">
          {(Object.entries(employeeFilters) as [EmployeeFilter, string][]).map(
            ([filter, label]) => (
              <Button
                key={filter}
                variant={c.filter === filter ? "primary" : "outline"}
                aria-pressed={c.filter === filter}
                fullWidth
                onPress={() => {
                  setFilterOpen(false);
                  if (c.filter === filter) return;
                  setBulkIds([]);
                  void c.task(() =>
                    c.loadEmployees(search, false, null, filter),
                  );
                }}
              >
                {label}
              </Button>
            ),
          )}
        </div>
      </Sheet>
      <Sheet
        open={importOpen}
        onClose={() => {
          if (!c.busy) {
            setImportOpen(false);
            setProgress(0);
          }
        }}
        title={preview ? "Conferir planilha" : "Importar colaboradores"}
      >
        <div className="import-content">
          {!preview ? (
            <>
              <div className="file-illustration">
                <FileSpreadsheet size={42} />
              </div>
              <h2>Sua base, sem complicação.</h2>
              <p>
                Use Matrícula, Nome e CPF.
                <br />
                Aceitamos Excel (.xlsx) e CSV.
              </p>
              <FileTrigger
                acceptedFileTypes={[".xlsx", ".csv"]}
                onSelect={(files) => void readFile(files)}
              >
                <Button
                  fullWidth
                  className="primary-button"
                  isDisabled={c.busy}
                >
                  <Upload size={20} />
                  {c.busy ? "Lendo planilha…" : "Selecionar planilha"}
                </Button>
              </FileTrigger>
              <Button
                variant="ghost"
                fullWidth
                onPress={() =>
                  void import("@/lib/spreadsheet").then((m) =>
                    m.downloadTemplate(),
                  )
                }
              >
                <Download size={16} />
                Baixar modelo
              </Button>
              <p className="footnote">
                Sem Status na planilha? Novos entram ativos; os status
                existentes são mantidos.
              </p>
            </>
          ) : (
            <>
              <div className="import-count">
                <strong>{preview.rows.length.toLocaleString("pt-BR")}</strong>
                <span>linhas válidas</span>
              </div>
              {preview.errors.length ? (
                <Feedback>
                  <strong>
                    Corrija {preview.errors.length} erro(s) e envie novamente.
                  </strong>
                  <ul>
                    {preview.errors.slice(0, 6).map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </Feedback>
              ) : null}
              <div className="import-preview">
                {preview.rows.slice(0, 4).map((r) => (
                  <div key={r.cpf}>
                    <span>
                      <strong>{r.name}</strong>
                      <small>
                        Mat. {r.employeeId} · {maskCpf(r.cpf)}
                      </small>
                    </span>
                    <Check size={17} />
                  </div>
                ))}
              </div>
              <p className="footnote">
                Prévia das primeiras 4 linhas. Entregas já registradas serão
                preservadas.
              </p>
              {c.busy ? (
                <ProgressBar
                  aria-label="Importação"
                  value={progress}
                  maxValue={preview.rows.length}
                >
                  <ProgressBar.Track>
                    <ProgressBar.Fill />
                  </ProgressBar.Track>
                  <ProgressBar.Output />
                </ProgressBar>
              ) : null}
              <Button
                fullWidth
                className="primary-button"
                onPress={() => void importRows()}
                isDisabled={
                  c.busy || !!preview.errors.length || !preview.rows.length
                }
              >
                {c.busy ? "Importando…" : "Confirmar importação"}
                <ArrowRight size={19} />
              </Button>
              <Button
                fullWidth
                variant="ghost"
                onPress={() => setPreview(null)}
                isDisabled={c.busy}
              >
                Escolher outra planilha
              </Button>
            </>
          )}
          {importError ? <Feedback>{importError}</Feedback> : null}
        </div>
      </Sheet>
      <Sheet
        open={createOpen}
        onClose={() => !c.busy && setCreateOpen(false)}
        title="Adicionar colaborador"
      >
        {createOpen ? (
          <Form
            className="access-form"
            onSubmit={(event) => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              void c.task(async () => {
                await c.call("admin.createEmployee", {
                  name: fields.get("name"),
                  employeeId: fields.get("employeeId"),
                  cpf: newCpf,
                });
                setCreateOpen(false);
                setSearch(newCpf);
                await Promise.all([
                  c.loadEmployees(newCpf, false, null, "all"),
                  c.refresh(),
                ]);
                c.setNotice("Colaborador adicionado.");
              });
            }}
          >
            <Field
              label="Nome completo"
              name="name"
              isRequired
              maxLength={160}
              isDisabled={c.busy}
            />
            <Field
              label="Matrícula"
              name="employeeId"
              isRequired
              maxLength={30}
              isDisabled={c.busy}
            />
            <Field
              label="CPF"
              name="cpf"
              value={newCpf}
              onChange={(value) => setNewCpf(formatCpf(value))}
              isRequired
              inputMode="numeric"
              minLength={14}
              isDisabled={c.busy}
            />
            <Button
              type="submit"
              fullWidth
              className="primary-button"
              isDisabled={c.busy}
            >
              Adicionar colaborador
            </Button>
          </Form>
        ) : null}
      </Sheet>
      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Colaborador"
      >
        {selected ? (
          <div className="employee-detail">
            <h2>{selected.name}</h2>
            <div className="identity-details">
              <div>
                <span>CPF</span>
                <strong>{formatCpf(selected.cpf)}</strong>
              </div>
              <div>
                <span>Matrícula</span>
                <strong>{selected.employeeId}</strong>
              </div>
              <div>
                <span>Cadastro</span>
                <strong>{selected.active ? "Ativo" : "Inativo"}</strong>
              </div>
              {selected.inactivatedAt ? (
                <div>
                  <span>Última inativação</span>
                  <strong>{formatDateTime(selected.inactivatedAt)}</strong>
                </div>
              ) : null}
              {selected.code ? (
                <div>
                  <span>Código</span>
                  <strong>{selected.code}</strong>
                </div>
              ) : null}
              {selected.scheduledDate ? (
                <div>
                  <span>Agendamento</span>
                  <strong>{formatDay(selected.scheduledDate)}</strong>
                </div>
              ) : null}
              {selected.delivery ? (
                <>
                  <div>
                    <span>Entregue em</span>
                    <strong>{formatDateTime(selected.delivery.at)}</strong>
                  </div>
                  <div>
                    <span>Conferido por</span>
                    <strong>
                      {shortName(selected.delivery.operatorName)} (
                      {selected.delivery.operatorEmployeeId})
                    </strong>
                  </div>
                </>
              ) : null}
            </div>
            {selected.delivery ? (
              <Button
                fullWidth
                variant="outline"
                onPress={() => setConfirmReverse(true)}
                isDisabled={c.busy}
              >
                Reverter entrega
              </Button>
            ) : null}
            <Button
              fullWidth
              variant={selected.active ? "danger" : "primary"}
              className={selected.active ? "danger-button" : "primary-button"}
              onPress={() => setConfirmStatus(true)}
              isDisabled={c.busy}
            >
              {selected.active
                ? "Inativar colaborador"
                : "Reativar colaborador"}
            </Button>
          </div>
        ) : null}
      </Sheet>
      <Confirm
        open={confirmBulk}
        onClose={() => setConfirmBulk(false)}
        title={`Inativar ${bulkIds.length} cadastro(s)?`}
        confirmLabel="Sim, inativar"
        danger
        busy={c.busy}
        onConfirm={() =>
          void c.task(async () => {
            const { changed } = await c.call<{ changed: number }>(
              "admin.inactivateEmployees",
              { ids: bulkIds },
            );
            setConfirmBulk(false);
            setBulkMode(false);
            setBulkIds([]);
            await Promise.all([c.loadEmployees(c.query), c.refresh()]);
            c.setNotice(`${changed} cadastro(s) inativado(s).`);
          })
        }
      >
        <p>
          As retiradas serão bloqueadas. Entregas já registradas ficam no
          histórico.
        </p>
      </Confirm>
      <Confirm
        open={confirmReverse}
        onClose={() => setConfirmReverse(false)}
        title="Reverter entrega?"
        confirmLabel="Sim, reverter entrega"
        danger
        busy={c.busy}
        onConfirm={() =>
          void c.task(async () => {
            if (!selected?.delivery) return;
            await c.call("admin.reverseDelivery", {
              id: selected.id,
              deliveredAt: selected.delivery.at,
            });
            setConfirmReverse(false);
            setSelected(null);
            await Promise.all([c.loadEmployees(search), c.refresh()]);
            c.setNotice("Entrega revertida. O histórico foi preservado.");
          })
        }
      >
        <p>
          {selected?.name} voltará a aparecer como não entregue. A entrega
          anterior ficará no histórico.
        </p>
      </Confirm>
      <Confirm
        open={confirmStatus}
        onClose={() => setConfirmStatus(false)}
        title={
          selected?.active ? "Inativar colaborador?" : "Reativar colaborador?"
        }
        confirmLabel={selected?.active ? "Sim, inativar" : "Sim, reativar"}
        danger={selected?.active}
        busy={c.busy}
        onConfirm={() =>
          void c.task(async () => {
            if (!selected) return;
            await c.call("admin.status", {
              id: selected.id,
              active: !selected.active,
            });
            setConfirmStatus(false);
            setSelected(null);
            await Promise.all([c.loadEmployees(search), c.refresh()]);
            c.setNotice("Cadastro atualizado.");
          })
        }
      >
        <p>{selected?.name}</p>
        <p>
          {selected?.active
            ? "A retirada será bloqueada."
            : "A retirada será liberada se a cesta ainda não tiver sido entregue."}
        </p>
      </Confirm>
    </Screen>
  );
}
