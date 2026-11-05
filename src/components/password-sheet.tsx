"use client";
import { useState } from "react";
import { Button } from "@heroui/react/button";
import { Form } from "@heroui/react/form";
import { ArrowRight, Check } from "lucide-react";
import { Feedback, Field, Sheet } from "./ui";
import { changeOwnPassword } from "@/lib/change-password";

export default function PasswordSheet({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [step, setStep] = useState(0);
  function close() {
    if (busy) return;
    setCurrent("");
    setPassword("");
    setConfirmation("");
    setError("");
    setStep(0);
    onClose();
  }
  async function save() {
    setError("");
    setBusy(true);
    try {
      await changeOwnPassword(current, password, confirmation);
      setCurrent("");
      setPassword("");
      setConfirmation("");
      setStep(0);
      onClose();
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      open={open}
      onClose={close}
      title={step === 0 ? "Alterar minha senha" : "Definir nova senha"}
    >
      <Form
        className="access-form"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          if (step === 0) setStep(1);
          else void save();
        }}
      >
        {step === 0 ? (
          <>
            <p>Confirme sua senha atual para proteger o seu acesso.</p>
            <Field
              label="Senha atual"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={setCurrent}
              isRequired
              isDisabled={busy}
            />
          </>
        ) : (
          <>
            <p>Use de 10 a 128 caracteres para a nova senha.</p>
            <Field
              label="Nova senha"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              isRequired
              minLength={10}
              maxLength={128}
              isDisabled={busy}
            />
            <Field
              label="Confirmar nova senha"
              name="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={setConfirmation}
              isRequired
              minLength={10}
              maxLength={128}
              isDisabled={busy}
            />
          </>
        )}
        {error ? <Feedback>{error}</Feedback> : null}
        <Button
          type="submit"
          fullWidth
          className="primary-button"
          isDisabled={busy}
        >
          {busy ? "Alterando…" : step === 0 ? "Continuar" : "Salvar nova senha"}
          {step === 0 ? <ArrowRight size={19} /> : <Check size={19} />}
        </Button>
        {step === 1 ? (
          <Button
            variant="ghost"
            fullWidth
            onPress={() => {
              setStep(0);
              setError("");
            }}
            isDisabled={busy}
          >
            Voltar à senha atual
          </Button>
        ) : null}
      </Form>
    </Sheet>
  );
}
