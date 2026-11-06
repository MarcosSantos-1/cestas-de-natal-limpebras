"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@heroui/react/button";
import { Form } from "@heroui/react/form";
import { Checkbox } from "@heroui/react/checkbox";
import { Chip } from "@heroui/react/chip";
import { Spinner } from "@heroui/react/spinner";
import { Link } from "@heroui/react/link";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import {
  ArrowRight,
  ScanLine,
  Users,
  ChartNoAxesCombined,
  UserRound,
  Camera,
  Search,
  Check,
  CheckCheck,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Upload,
  ChevronRight,
} from "lucide-react";
import { Brand } from "./brand";
import { Back, Feedback, Field, Screen, Sheet } from "./ui";
import { useAdmin } from "./use-admin";
import type { AdminTab } from "./use-admin";
import { clientAuth } from "@/lib/firebase-client";
import {
  Employee,
  formatCodeInput,
  formatCpf,
  formatDateTime,
  formatDay,
  normalizeCode,
  shortName,
} from "@/lib/domain";
const Scanner = dynamic(() => import("./scanner"), { ssr: false });
const EmployeesScreen = dynamic(() => import("./employees-screen"));
const AccountScreen = dynamic(() => import("./account-screen"));
const OverviewScreen = dynamic(() => import("./overview-screen"));
const tabs = [
  { id: "check", label: "Conferir", icon: ScanLine },
  { id: "employees", label: "Pessoas", icon: Users },
  { id: "overview", label: "Resumo", icon: ChartNoAxesCombined },
  { id: "account", label: "Conta", icon: UserRound },
] as const;
export default function AdminApp({ campaignLabel }: { campaignLabel: string }) {
  const controller = useAdmin();
  const {
    user,
    admin,
    ready,
    tab,
    navigate,
    error,
    setError,
    notice,
    busy,
    task,
    stats,
    call,
    refresh,
    logout,
  } = controller;
  const [login, setLogin] = useState(""),
    [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [candidate, setCandidate] = useState<Employee | null>(null),
    [camera, setCamera] = useState(false),
    [checked, setChecked] = useState(false);
  async function lookup(value = code) {
    setCamera(false);
    setCandidate(null);
    setChecked(false);
    const normalized = normalizeCode(value);
    if (!normalized) {
      setError("Use um código como LA-0025.");
      return;
    }
    setCode(normalized);
    await task(async () =>
      setCandidate(await call<Employee>("admin.lookup", { code: normalized })),
    );
  }
  function nextDelivery() {
    setCandidate(null);
    setCode("");
    setChecked(false);
    setError("");
  }
  if (!ready)
    return (
      <div className="app-viewport loading-screen">
        <Brand />
        <Spinner size="lg" />
        <p>Preparando seu acesso…</p>
      </div>
    );
  if (!admin)
    return (
      <div className="app-viewport login-app">
        <header className="mobile-header">
          <Brand />
          <Link href="/" className="rh-link">
            Sou colaborador <ArrowRight size={15} />
          </Link>
        </header>
        <main className="login-stage">
          <Screen id="login">
            <div className="screen-copy">
              <div className="step-icon blue-icon">
                <ShieldCheck size={28} />
              </div>
              <p className="eyebrow">PORTAL DO RH</p>
              <h1>
                Pronto para
                <br />a próxima entrega?
              </h1>
              <p className="screen-description">
                Entre com seu acesso individual.
              </p>
            </div>
            {user ? (
              <>
                <Feedback>
                  {error || "Esta conta não está autorizada."}
                </Feedback>
                <Button
                  fullWidth
                  className="primary-button"
                  onPress={() => void logout()}
                >
                  Usar outra conta
                </Button>
              </>
            ) : (
              <Form
                className="step-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void task(async () => {
                    await setPersistence(
                      clientAuth(),
                      browserSessionPersistence,
                    );
                    try {
                      await signInWithEmailAndPassword(
                        clientAuth(),
                        login.includes("@")
                          ? login.trim()
                          : `${login.trim()}@rh.cestas.limpebras.local`,
                        password,
                      );
                      setPassword("");
                    } catch {
                      throw new Error("Confira seu acesso e sua senha.");
                    }
                  });
                }}
              >
                <Field
                  label="E-mail ou matrícula"
                  name="login"
                  value={login}
                  onChange={setLogin}
                  placeholder="E-mail ou matrícula"
                  autoComplete="username"
                  isRequired
                  isDisabled={busy}
                />
                <Field
                  label="Senha"
                  name="password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  isRequired
                  isDisabled={busy}
                />
                {error ? <Feedback>{error}</Feedback> : null}
                <div className="screen-actions">
                  <Button
                    type="submit"
                    fullWidth
                    className="primary-button"
                    isDisabled={busy}
                  >
                    {busy ? "Entrando…" : "Entrar no painel"}
                    <ArrowRight size={20} />
                  </Button>
                </div>
              </Form>
            )}
          </Screen>
        </main>
        <footer className="public-app-footer">
          <span className="brand-stripes">
            <i />
            <i />
            <i />
          </span>
          <span>Uma pessoa. Um acesso. Cada entrega registrada.</span>
        </footer>
      </div>
    );
  const delivered = candidate?.delivery;
  const selectTab = (id: AdminTab) => {
    if (id === "check" && tab !== "check") nextDelivery();
    navigate(id);
  };
  const navigation = (desktop = false) => (
    <nav
      className={desktop ? "sidebar-nav" : "bottom-nav"}
      aria-label={desktop ? "Navegação desktop do RH" : "Navegação do RH"}
    >
      {tabs.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          variant="ghost"
          className={`nav-item ${tab === id ? "selected" : ""}`}
          isDisabled={busy}
          onPress={() => selectTab(id)}
          aria-current={tab === id ? "page" : undefined}
          aria-label={
            id === "check"
              ? "Conferir entrega"
              : id === "employees"
                ? "Colaboradores"
                : id === "overview"
                  ? "Resumo"
                  : "Minha conta"
          }
        >
          <span className="nav-icon">
            <Icon size={23} strokeWidth={tab === id ? 2 : 1.7} />
          </span>
          <span>
            {desktop
              ? id === "check"
                ? "Conferir entrega"
                : id === "employees"
                  ? "Colaboradores"
                  : id === "account"
                    ? "Minha conta"
                    : label
              : label}
          </span>
        </Button>
      ))}
    </nav>
  );
  return (
    <div className="app-viewport admin-app">
      <aside className="desktop-sidebar">
        <Brand admin />
        <div className="sidebar-campaign">
          <span />
          {campaignLabel}
        </div>
        <p className="sidebar-label">OPERAÇÃO</p>
        {navigation(true)}
        <div className="sidebar-footer">
          <ShieldCheck size={21} />
          <p>
            Cada entrega importa.<small>Uma cesta por colaborador.</small>
          </p>
        </div>
      </aside>
      <header className="admin-header">
        <Brand admin />
        <div className="desktop-heading">
          <span>Portal do RH</span>
          <strong>
            {tab === "check"
              ? "Conferência de entregas"
              : tab === "employees"
                ? "Colaboradores"
                : tab === "overview"
                  ? "Resumo da campanha"
                  : "Minha conta"}
          </strong>
        </div>
        <Button
          variant="ghost"
          className="operator-button"
          isDisabled={busy}
          onPress={() => navigate("account")}
          aria-label={`Conta de ${admin.name}`}
        >
          <span className="operator-avatar">
            {admin.name
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")}
          </span>
          <span>
            {admin.name.split(" ")[0]}
            <small>RH · {admin.employeeId}</small>
          </span>
        </Button>
      </header>
      <div className="campaign-ribbon">
        <span>
          <i />
          {campaignLabel}
        </span>
        <span>
          {stats ? `${stats.delivered} entregas` : "Operação de entrega"}
        </span>
      </div>
      <main
        className={`admin-stage ${tab === "check" ? "check-stage" : "scroll-stage"}`}
      >
        {tab === "check" ? (
          <Screen
            id={candidate ? (delivered ? "delivered" : "candidate") : "check"}
            key={candidate ? (delivered ? "delivered" : "candidate") : "check"}
            className="check-screen"
          >
            {candidate ? (
              <>
                <div className="screen-toolbar">
                  <Back onPress={nextDelivery} disabled={busy} />
                  <span className="eyebrow">
                    {delivered
                      ? "ENTREGA REGISTRADA"
                      : "CONFIRA A IDENTIFICAÇÃO"}
                  </span>
                  <Chip className="code-chip" size="sm">
                    {candidate.code}
                  </Chip>
                </div>
                {delivered ? (
                  <>
                    <div className="delivered-header">
                      <div className="success-medal">
                        <CheckCheck size={40} />
                      </div>
                      <h1>
                        Mais uma cesta.
                        <br />
                        Mais um Natal.
                      </h1>
                      <p className="screen-description">
                        Entrega confirmada para {candidate.name.split(" ")[0]}.
                      </p>
                    </div>
                    <div className="receipt">
                      <div>
                        <span>Colaborador</span>
                        <strong>{candidate.name}</strong>
                      </div>
                      <div>
                        <span>Entregue em</span>
                        <strong>{formatDateTime(delivered.at)}</strong>
                      </div>
                      <div>
                        <span>Conferido por</span>
                        <strong>
                          {shortName(delivered.operatorName)} (
                          {delivered.operatorEmployeeId})
                        </strong>
                      </div>
                    </div>
                    <div className="screen-actions">
                      <Button
                        fullWidth
                        className="primary-button"
                        onPress={nextDelivery}
                      >
                        Próxima entrega <ScanLine size={20} />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="candidate-heading">
                      <div className="candidate-avatar">
                        {candidate.name
                          .split(" ")
                          .slice(0, 2)
                          .map((s) => s[0])
                          .join("")}
                      </div>
                      <h1>{candidate.name}</h1>
                      <Chip
                        className={
                          candidate.active ? "solid-chip" : "danger-chip"
                        }
                        color={candidate.active ? "success" : "danger"}
                        size="sm"
                      >
                        {candidate.active
                          ? "Cadastro ativo"
                          : "Cadastro inativo"}
                      </Chip>
                    </div>
                    <div className="identity-details">
                      <div>
                        <span>CPF</span>
                        <strong>{formatCpf(candidate.cpf)}</strong>
                      </div>
                      <div>
                        <span>Matrícula</span>
                        <strong>{candidate.employeeId || "—"}</strong>
                      </div>
                      {candidate.scheduledDate ? (
                        <div>
                          <span>Agendamento</span>
                          <strong>{formatDay(candidate.scheduledDate)}</strong>
                        </div>
                      ) : null}
                    </div>
                    {candidate.active ? (
                      <>
                        <Checkbox
                          isSelected={checked}
                          onChange={setChecked}
                          className="delivery-checkbox"
                        >
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                            <span>Conferi a identificação e a assinatura.</span>
                          </Checkbox.Content>
                        </Checkbox>
                        {error ? <Feedback>{error}</Feedback> : null}
                        <div className="screen-actions">
                          <Button
                            fullWidth
                            className="green-button"
                            isDisabled={!checked || busy}
                            onPress={() =>
                              void task(async () => {
                                const result = await call<Employee>(
                                  "admin.deliver",
                                  { code: candidate.code },
                                );
                                setCandidate(result);
                                setChecked(false);
                                await refresh();
                              })
                            }
                          >
                            {busy ? "Registrando…" : "Confirmar cesta entregue"}
                            <PackageCheck size={20} />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Feedback>
                          Retirada bloqueada.
                          {candidate.inactivatedAt
                            ? ` Inativado em ${formatDateTime(candidate.inactivatedAt)}.`
                            : ""}
                        </Feedback>
                        <div className="screen-actions">
                          <Button
                            fullWidth
                            variant="outline"
                            onPress={nextDelivery}
                          >
                            Conferir outro código
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <div className="screen-copy">
                  <p className="eyebrow">CONFERÊNCIA RÁPIDA</p>
                  <h1>
                    Vamos entregar
                    <br />
                    um bom Natal.
                  </h1>
                  <p className="screen-description">
                    Leia o QR ou digite o código do colaborador.
                  </p>
                </div>
                {stats?.total === 0 ? (
                  <div className="first-import">
                    <span className="step-icon yellow-icon">
                      <Users size={25} />
                    </span>
                    <h2>Primeiro, nossa equipe.</h2>
                    <p>Importe a planilha para começar as entregas.</p>
                    <Button
                      fullWidth
                      className="primary-button"
                      onPress={() => navigate("employees")}
                    >
                      Importar colaboradores <Upload size={18} />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      className="camera-launch"
                      fullWidth
                      onPress={() => setCamera(true)}
                      isDisabled={busy}
                    >
                      <span className="scan-corners">
                        <ScanLine size={48} strokeWidth={1.5} />
                      </span>
                      <strong>Ler QR code</strong>
                      <span>
                        Abrir câmera <Camera size={15} />
                      </span>
                    </Button>
                    <Form
                      className="manual-code"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void lookup();
                      }}
                    >
                      <Field
                        label="Ou digite o código"
                        name="code"
                        value={code}
                        onChange={(value) => {
                          const formatted =
                            normalizeCode(value) || formatCodeInput(value);
                          if (formatted !== null) setCode(formatted);
                        }}
                        placeholder="LA-0025"
                        autoComplete="off"
                        isRequired
                        isDisabled={busy}
                        className="code-field"
                      />
                      <Button
                        type="submit"
                        className="primary-button"
                        aria-label="Conferir código"
                        isDisabled={busy}
                      >
                        {busy ? (
                          <RefreshCw size={21} className="spin" />
                        ) : (
                          <ArrowRight size={23} />
                        )}
                      </Button>
                    </Form>
                    {error ? <Feedback>{error}</Feedback> : null}
                    <div className="check-hint">
                      <ShieldCheck size={17} />
                      <span>
                        A leitura abre a conferência.
                        <br />
                        Só você confirma a entrega.
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </Screen>
        ) : null}
        {tab === "employees" ? (
          <EmployeesScreen controller={controller} />
        ) : null}
        {tab === "account" ? <AccountScreen controller={controller} /> : null}
        {tab === "overview" ? (
          <OverviewScreen
            controller={controller}
            campaignLabel={campaignLabel}
          />
        ) : null}
        {tab !== "check" && error ? <Feedback>{error}</Feedback> : null}
        {tab !== "check" && notice ? (
          <Feedback success>{notice}</Feedback>
        ) : null}
      </main>
      {navigation()}
      <Sheet open={camera} onClose={() => setCamera(false)} title="Ler QR code">
        <Scanner
          onRead={(value) => void lookup(value)}
          onClose={() => setCamera(false)}
        />
      </Sheet>
    </div>
  );
}
