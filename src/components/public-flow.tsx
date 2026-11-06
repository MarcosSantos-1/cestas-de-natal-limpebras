"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@heroui/react/button";
import { Form } from "@heroui/react/form";
import { Link } from "@heroui/react/link";
import { Chip } from "@heroui/react/chip";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCheck,
  Gift,
  PackageCheck,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Clock3,
} from "lucide-react";
import { Brand } from "./brand";
import { Back, Confirm, Feedback, Field, Screen } from "./ui";
import { api } from "@/lib/api-client";
import {
  PublicEmployee,
  formatCpf,
  formatDateTime,
  formatDay,
  shortName,
} from "@/lib/domain";
const PickupDate = dynamic(() => import("./pickup-date"));
type Step =
  | "welcome"
  | "identity"
  | "choice"
  | "schedule"
  | "ticket"
  | "done"
  | "inactive";
export default function PublicFlow({ label }: { label: string }) {
  const [step, setStep] = useState<Step>("welcome"),
    [name, setName] = useState(""),
    [cpf, setCpf] = useState(""),
    [employee, setEmployee] = useState<PublicEmployee | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [date, setDate] = useState(""),
    [cancel, setCancel] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null),
    generation = useRef(0),
    lastStep = useRef(step);
  useEffect(() => {
    if (lastStep.current !== step) {
      heading.current?.focus({ preventScroll: true });
      lastStep.current = step;
    }
  }, [step]);
  function show(e: PublicEmployee) {
    setEmployee(e);
    setStep(
      e.delivery
        ? "done"
        : !e.active
          ? "inactive"
          : e.code
            ? "ticket"
            : "choice",
    );
  }
  async function run(action: string, extra: Record<string, unknown> = {}) {
    const request = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const result = await api<PublicEmployee>(action, { name, cpf, ...extra });
      if (request === generation.current) {
        show(result);
        setCancel(false);
      }
    } catch (e) {
      if (request === generation.current) setError((e as Error).message);
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (step !== "ticket") return;
    let active = true;
    const poll = () => {
      if (document.visibilityState !== "visible") return;
      const request = generation.current;
      void api<PublicEmployee>("public.lookup", { name, cpf })
        .then((e) => {
          if (active && request === generation.current) show(e);
        })
        .catch(() => {});
    };
    const timer = setInterval(poll, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [step, name, cpf]);
  function go(next: Step) {
    setStep(next);
    setError("");
  }
  function reset() {
    generation.current++;
    setName("");
    setCpf("");
    setEmployee(null);
    setDate("");
    setError("");
    setBusy(false);
    go("welcome");
  }
  const delivery = employee?.delivery;
  const title = (text: string) => (
    <h1 ref={heading} tabIndex={-1}>
      {text}
    </h1>
  );
  const back = () => {
    if (step === "identity") go("welcome");
    else if (step === "schedule") go("choice");
    else if (step === "choice") go("identity");
    else reset();
  };
  return (
    <div className={`public-app app-viewport step-${step}`}>
      <header className="mobile-header">
        <Brand />
        <Link href="/admin" className="rh-link">
          Sou do RH <ArrowRight size={15} />
        </Link>
      </header>
      <main className="public-stage">
        <div className="flow-top">
          <div className="step-back">
            {step !== "welcome" ? (
              <Back onPress={back} disabled={busy} />
            ) : (
              <span className="campaign-name">{label}</span>
            )}
          </div>
        </div>
        <Screen
          id={step}
          key={step}
          className={step === "welcome" ? "welcome-screen" : ""}
        >
          {step === "welcome" ? (
            <>
              <div className="welcome-art" aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <span className="art-star star-a">✦</span>
                <span className="art-star star-b">✦</span>
                <div className="present">
                  <div className="present-bow">
                    <i />
                    <i />
                  </div>
                  <div className="present-lid" />
                  <div className="present-base" />
                  <div className="present-tag">
                    <Check size={23} />
                  </div>
                </div>
                <div className="art-label">
                  <span /> O seu presente está aqui.
                </div>
              </div>
              <div className="screen-copy">
                <p className="eyebrow">NATAL É TEMPO DE COMPARTILHAR</p>
                {title("Uma cesta de carinho. Para você.")}
                <p className="screen-description">
                  Consulte sua cesta e apresente o código ao RH. Simples assim.
                </p>
              </div>
              <div className="screen-actions">
                <Button
                  className="primary-button"
                  fullWidth
                  onPress={() => go("identity")}
                >
                  Retirar minha cesta <ArrowRight size={20} />
                </Button>
                <p className="footnote">
                  <ShieldCheck size={14} /> Tenha seu CPF em mãos.
                </p>
              </div>
            </>
          ) : null}
          {step === "identity" ? (
            <>
              <div className="screen-copy">
                <div className="step-icon blue-icon">
                  <ShieldCheck size={27} />
                </div>
                <p className="eyebrow">VAMOS COMEÇAR</p>
                {title("Primeiro, quem é você?")}
                <p className="screen-description">
                  Informe seu CPF e seu nome completo.
                </p>
              </div>
              <Form
                className="step-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run("public.lookup");
                }}
              >
                <Field
                  label="CPF"
                  name="cpf"
                  value={cpf}
                  onChange={(v) => setCpf(formatCpf(v))}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="000.000.000-00"
                  isRequired
                  minLength={14}
                  maxLength={14}
                  isDisabled={busy}
                />
                <Field
                  label="Nome completo"
                  name="name"
                  value={name}
                  onChange={setName}
                  autoComplete="name"
                  placeholder="Seu nome completo"
                  isRequired
                  maxLength={160}
                  isDisabled={busy}
                />
                {error ? <Feedback>{error}</Feedback> : null}
                <div className="screen-actions">
                  <Button
                    type="submit"
                    className="primary-button"
                    fullWidth
                    isDisabled={busy}
                  >
                    {busy ? "Consultando…" : "Continuar"}
                    <ArrowRight size={20} />
                  </Button>
                  <p className="footnote">
                    Seus dados são usados somente na conferência.
                  </p>
                </div>
              </Form>
            </>
          ) : null}
          {step === "choice" ? (
            <>
              <div className="screen-copy">
                <div className="step-icon green-icon">
                  <Gift size={28} />
                </div>
                <p className="eyebrow">
                  TUDO CERTO, {employee?.name.split(" ")[0].toUpperCase()}
                </p>
                {title("Sua cesta está esperando.")}
                <p className="screen-description">Como você prefere retirar?</p>
              </div>
              <div className="choice-options">
                <Button
                  className="choice-card now-card"
                  onPress={() => void run("public.request", { mode: "now" })}
                  isDisabled={busy}
                >
                  <span className="choice-icon">
                    <QrCode size={26} />
                  </span>
                  <span>
                    <strong>Retirar agora</strong>
                    <small>Gerar meu código de retirada</small>
                  </span>
                  <ArrowRight size={21} />
                </Button>
                <Button
                  variant="outline"
                  className="choice-card later-card"
                  onPress={() => go("schedule")}
                  isDisabled={busy}
                >
                  <span className="choice-icon">
                    <CalendarDays size={25} />
                  </span>
                  <span>
                    <strong>Agendar retirada</strong>
                    <small>Escolher outro dia</small>
                  </span>
                  <ArrowRight size={21} />
                </Button>
              </div>
              {error ? <Feedback>{error}</Feedback> : null}
              <p className="footnote bottom-note">
                <ShieldCheck size={15} /> A entrega é confirmada pelo RH.
              </p>
            </>
          ) : null}
          {step === "schedule" ? (
            <>
              <div className="screen-copy">
                <div className="step-icon yellow-icon">
                  <CalendarDays size={27} />
                </div>
                <p className="eyebrow">NO SEU TEMPO</p>
                {title("Qual dia fica melhor?")}
                <p className="screen-description">
                  Escolha o melhor dia para você, a partir de hoje.
                </p>
              </div>
              <Form
                className="step-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run("public.request", { mode: "schedule", date });
                }}
              >
                <PickupDate value={date} onChange={setDate} busy={busy} />
                <div className="schedule-note">
                  <Clock3 size={19} />
                  <p>
                    Você escolhe o dia. O atendimento segue o horário do RH.
                  </p>
                </div>
                {error ? <Feedback>{error}</Feedback> : null}
                <div className="screen-actions">
                  <Button
                    className="primary-button"
                    fullWidth
                    type="submit"
                    isDisabled={busy || !date}
                  >
                    {busy ? "Agendando…" : "Confirmar agendamento"}
                    <Check size={19} />
                  </Button>
                </div>
              </Form>
            </>
          ) : null}
          {step === "ticket" ? (
            <>
              <div className="ticket-heading">
                <Chip className="solid-chip" size="sm" color="success">
                  {employee?.scheduledDate
                    ? "Retirada agendada"
                    : "Pronto para retirar"}
                </Chip>
                {title("É só apresentar ao RH.")}
                <p className="screen-description">{employee?.name}</p>
              </div>
              <div className="ticket-pass">
                <div className="pass-qr">
                  <QRCodeSVG
                    value={`CESTA:${employee?.code}`}
                    size={176}
                    marginSize={2}
                    level="M"
                  />
                </div>
                <span className="pass-code-label">SEU CÓDIGO</span>
                <strong className="ticket-code">{employee?.code}</strong>
                {employee?.scheduledDate ? (
                  <span className="pass-date">
                    <CalendarDays size={16} />
                    {formatDay(employee.scheduledDate)}
                  </span>
                ) : null}
                <div className="pass-bottom">
                  <ShieldCheck size={15} /> Leve também sua identificação.
                </div>
              </div>
              {error ? <Feedback>{error}</Feedback> : null}
              <div className="screen-actions ticket-actions">
                <Button
                  variant="outline"
                  fullWidth
                  onPress={() => void run("public.lookup")}
                  isDisabled={busy}
                >
                  <RefreshCw size={17} />
                  {busy ? "Atualizando…" : "Atualizar situação"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => setCancel(true)}
                  isDisabled={busy}
                >
                  Cancelar pedido ou reagendar
                </Button>
              </div>
            </>
          ) : null}
          {step === "done" && delivery ? (
            <>
              <div className="screen-copy done-copy">
                <div className="success-medal">
                  <CheckCheck size={43} />
                </div>
                <p className="eyebrow">MISSÃO CUMPRIDA</p>
                {title("Sua cesta foi entregue.")}
                <p className="screen-description">
                  Boas festas, {employee?.name.split(" ")[0]}!
                </p>
              </div>
              <div className="receipt">
                <div>
                  <span>Data e hora</span>
                  <strong>{formatDateTime(delivery.at)}</strong>
                </div>
                <div>
                  <span>Código da entrega</span>
                  <strong className="mono">{delivery.code}</strong>
                </div>
                <div>
                  <span>Conferido por</span>
                  <strong>
                    {shortName(delivery.operatorName)} (
                    {delivery.operatorEmployeeId})
                  </strong>
                </div>
              </div>
              <div className="screen-actions">
                <Button fullWidth className="primary-button" onPress={reset}>
                  Concluir <Check size={20} />
                </Button>
              </div>
            </>
          ) : null}
          {step === "inactive" ? (
            <>
              <div className="screen-copy">
                <div className="step-icon yellow-icon">
                  <ShieldCheck size={28} />
                </div>
                <p className="eyebrow">PRECISAMOS CONFERIR</p>
                {title("Fale com o RH.")}
                <p className="screen-description">
                  Seu cadastro está inativo para esta campanha. Nossa equipe
                  pode ajudar.
                </p>
              </div>
              <div className="identity-summary">
                <strong>{employee?.name}</strong>
                <span>Cadastro inativo</span>
              </div>
              <div className="screen-actions">
                <Button fullWidth className="primary-button" onPress={reset}>
                  Voltar ao início <ArrowRight size={20} />
                </Button>
              </div>
            </>
          ) : null}
        </Screen>
      </main>
      <footer className="public-app-footer">
        <span className="brand-stripes">
          <i />
          <i />
          <i />
        </span>
        <span>Feito para quem faz parte.</span>
      </footer>
      <Confirm
        open={cancel}
        onClose={() => setCancel(false)}
        title="Cancelar este pedido?"
        confirmLabel="Sim, cancelar"
        busy={busy}
        danger
        onConfirm={() => void run("public.cancel")}
      >
        <p>
          O código atual deixará de funcionar. Depois você pode gerar outro ou
          escolher uma nova data.
        </p>
      </Confirm>
    </div>
  );
}
