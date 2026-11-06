"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@heroui/react/button";
import { Form } from "@heroui/react/form";
import { Link } from "@heroui/react/link";
import {
  ArrowRight,
  ChevronRight,
  LogOut,
  Plus,
  ShieldCheck,
  Users,
  UserRound,
  KeyRound,
} from "lucide-react";
import { Back, Confirm, Feedback, Field, Screen, Sheet } from "./ui";
import type { AdminController } from "./use-admin";
import type { Admin } from "@/lib/domain";
const PasswordSheet = dynamic(() => import("./password-sheet"));
export default function AccountScreen({
  controller: c,
}: {
  controller: AdminController;
}) {
  const [view, setView] = useState<"profile" | "accesses">("profile"),
    [admins, setAdmins] = useState<Admin[]>([]),
    [create, setCreate] = useState(false),
    [createStep, setCreateStep] = useState(0),
    [name, setName] = useState(""),
    [employeeId, setEmployeeId] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [remove, setRemove] = useState<Admin | null>(null),
    [formError, setFormError] = useState(""),
    [exit, setExit] = useState(false),
    [changePassword, setChangePassword] = useState(false);
  async function loadAdmins() {
    setView("accesses");
    await c.task(async () => setAdmins(await c.call<Admin[]>("admin.admins")));
  }
  async function createAdmin() {
    setFormError("");
    if (password !== confirmPassword) {
      setFormError("As senhas não conferem.");
      return;
    }
    await c.task(async () => {
      try {
        await c.call("admin.createAdmin", {
          name,
          employeeId,
          email,
          password,
          confirmPassword,
        });
        setAdmins(await c.call<Admin[]>("admin.admins"));
        setCreate(false);
        setName("");
        setEmployeeId("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setCreateStep(0);
        c.setNotice("Acesso criado. A pessoa entra com e-mail e senha.");
      } catch (e) {
        setFormError((e as Error).message);
      }
    });
  }
  return (
    <Screen id={view} key={view} className="account-screen">
      {view === "profile" ? (
        <>
          <div className="screen-copy compact-copy">
            <p className="eyebrow">SEU ACESSO</p>
            <h1>
              Quem confere
              <br />
              faz a diferença.
            </h1>
          </div>
          <div className="profile-card">
            <div className="large-avatar">
              {c.admin?.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </div>
            <h2>{c.admin?.name}</h2>
            <p>Matrícula {c.admin?.employeeId}</p>
            <span>
              <ShieldCheck size={15} />
              Administrador do RH
            </span>
          </div>
          <Button
            variant="outline"
            className="account-option"
            onPress={() => void loadAdmins()}
          >
            <Users size={22} />
            <span>Acessos do RH</span>
            <ChevronRight size={20} />
          </Button>
          <Button
            variant="outline"
            className="account-option"
            onPress={() => setChangePassword(true)}
          >
            <KeyRound size={22} />
            <span>Alterar minha senha</span>
            <ChevronRight size={20} />
          </Button>
          <Link href="/" className="account-option">
            <UserRound size={22} />
            <span>Portal do colaborador</span>
            <ChevronRight size={20} />
          </Link>
          <Button
            variant="ghost"
            className="signout-button"
            onPress={() => setExit(true)}
          >
            <LogOut size={18} />
            Sair da conta
          </Button>
        </>
      ) : (
        <>
          <div className="screen-toolbar">
            <Back onPress={() => setView("profile")} />
            <span className="eyebrow">ACESSOS DO RH</span>
          </div>
          <div className="screen-copy compact-copy">
            <h1>
              Cada pessoa,
              <br />
              seu próprio acesso.
            </h1>
          </div>
          <Button
            fullWidth
            className="primary-button"
            onPress={() => {
              setCreate(true);
              setCreateStep(0);
              setFormError("");
            }}
          >
            <Plus size={20} />
            Adicionar administrador
          </Button>
          <div className="access-list">
            {admins.map((a) => (
              <div className="access-person" key={a.uid}>
                <span className="person-circle">
                  {a.name
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span>
                  <strong>{a.name}</strong>
                  <small className="admin-email">
                    {a.email || "E-mail não disponível"}
                  </small>
                  <small>
                    Mat. {a.employeeId} · {a.active ? "Ativo" : "Inativo"}
                  </small>
                </span>
                {a.uid === c.admin?.uid ? (
                  <span className="you-label">Você</span>
                ) : a.active ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="remove-access"
                    aria-label={`Remover acesso de ${a.name}`}
                    onPress={() => setRemove(a)}
                    isDisabled={c.busy}
                  >
                    Remover
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
      <PasswordSheet
        open={changePassword}
        onClose={() => setChangePassword(false)}
        onSuccess={() =>
          c.setNotice(
            "Senha alterada com sucesso. No próximo acesso, use a nova senha.",
          )
        }
      />
      <Sheet
        open={create}
        onClose={() => {
          if (!c.busy) setCreate(false);
        }}
        title={createStep === 0 ? "Novo administrador" : "Definir senha"}
      >
        <Form
          className="access-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (createStep === 0) {
              setCreateStep(1);
              setFormError("");
            } else void createAdmin();
          }}
        >
          {createStep === 0 ? (
            <>
              <p>Quem vai ajudar nas entregas?</p>
              <Field
                label="Nome completo"
                name="name"
                value={name}
                onChange={setName}
                isRequired
                maxLength={160}
                placeholder="Nome do atendente"
              />
              <Field
                label="Matrícula"
                name="employeeId"
                value={employeeId}
                onChange={setEmployeeId}
                isRequired
                pattern="[0-9]{1,20}"
                inputMode="numeric"
              />
              <Field
                label="E-mail"
                name="email"
                type="email"
                value={email}
                onChange={setEmail}
                isRequired
                maxLength={254}
              />
            </>
          ) : (
            <>
              <p>
                Crie uma senha para <strong>{name.split(" ")[0]}</strong>.
              </p>
              <Field
                label="Senha"
                name="newPassword"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                isRequired
                minLength={10}
                placeholder="Pelo menos 10 caracteres"
                isDisabled={c.busy}
              />
              <Field
                label="Confirmar senha"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                isRequired
                minLength={10}
                placeholder="Digite a senha novamente"
                isDisabled={c.busy}
              />
            </>
          )}
          {formError ? <Feedback>{formError}</Feedback> : null}
          <Button
            type="submit"
            fullWidth
            className="primary-button"
            isDisabled={c.busy}
          >
            {c.busy
              ? "Criando…"
              : createStep === 0
                ? "Continuar"
                : "Criar acesso"}
            <ArrowRight size={19} />
          </Button>
          {createStep === 1 ? (
            <Button
              variant="ghost"
              fullWidth
              onPress={() => setCreateStep(0)}
              isDisabled={c.busy}
            >
              Voltar
            </Button>
          ) : null}
        </Form>
      </Sheet>
      <Confirm
        open={!!remove}
        onClose={() => setRemove(null)}
        title="Remover este acesso?"
        confirmLabel="Remover acesso"
        danger
        busy={c.busy}
        onConfirm={() =>
          void c.task(async () => {
            if (!remove) return;
            await c.call("admin.disableAdmin", { uid: remove.uid });
            setAdmins(await c.call<Admin[]>("admin.admins"));
            setRemove(null);
          })
        }
      >
        <p>
          {remove?.name} não poderá mais acessar o RH. As entregas já conferidas
          serão preservadas.
        </p>
      </Confirm>
      <Confirm
        open={exit}
        onClose={() => setExit(false)}
        title="Sair da sua conta?"
        confirmLabel="Sair"
        onConfirm={() => void c.logout()}
      >
        <p>Você precisará entrar novamente para conferir entregas.</p>
      </Confirm>
    </Screen>
  );
}
