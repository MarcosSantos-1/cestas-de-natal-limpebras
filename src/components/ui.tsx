"use client";
import type { ComponentProps, ReactNode } from "react";
import { TextField } from "@heroui/react/textfield";
import { Input } from "@heroui/react/input";
import { Label } from "@heroui/react/label";
import { FieldError } from "@heroui/react/field-error";
import { Alert } from "@heroui/react/alert";
import { AlertDialog } from "@heroui/react/alert-dialog";
import { Modal } from "@heroui/react/modal";
import { Button } from "@heroui/react/button";
import { motion, useReducedMotion } from "motion/react";
import { AlertCircle, CheckCircle2, ChevronLeft } from "lucide-react";

type FieldProps = Omit<
  ComponentProps<typeof TextField>,
  "children" | "className"
> & {
  label: string;
  inputMode?: ComponentProps<typeof Input>["inputMode"];
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
};
export function Field({
  label,
  inputMode,
  placeholder,
  className = "",
  autoFocus,
  ...props
}: FieldProps) {
  return (
    <TextField {...props} className={`field ${className}`}>
      <Label>{label}</Label>
      <Input
        inputMode={inputMode}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      <FieldError />
    </TextField>
  );
}
export function Feedback({
  children,
  success = false,
}: {
  children: ReactNode;
  success?: boolean;
}) {
  return (
    <Alert
      status={success ? "success" : "danger"}
      role={success ? "status" : "alert"}
      className={`feedback ${success ? "feedback-success" : "feedback-error"}`}
    >
      <Alert.Indicator>
        {success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      </Alert.Indicator>
      <Alert.Content>
        <Alert.Description>{children}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
export function Screen({
  children,
  id,
  className = "",
}: {
  children: ReactNode;
  id: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      key={id}
      className={`step-screen ${className}`}
      initial={
        reduced || ["welcome", "login", "check"].includes(id)
          ? false
          : { opacity: 0, y: 15 }
      }
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.section>
  );
}
export function Back({
  onPress,
  label = "Voltar",
  disabled = false,
}: {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      isIconOnly
      aria-label={label}
      className="back-control"
      onPress={onPress}
      isDisabled={disabled}
    >
      <ChevronLeft size={23} />
    </Button>
  );
}
export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = "Confirmar",
  busy = false,
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <AlertDialog
      isOpen={open}
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <AlertDialog.Backdrop className="dialog-backdrop">
        <AlertDialog.Container placement="center" size="sm">
          <AlertDialog.Dialog className="confirm-dialog">
            <AlertDialog.Header>
              <AlertDialog.Heading>{title}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>{children}</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="outline" onPress={onClose} isDisabled={busy}>
                Voltar
              </Button>
              <Button
                variant={danger ? "danger" : "primary"}
                className={danger ? "danger-button" : "primary-button"}
                onPress={onConfirm}
                isDisabled={busy}
              >
                {busy ? "Aguarde…" : confirmLabel}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
export function Sheet({
  open,
  onClose,
  title,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Modal
      isOpen={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Modal.Backdrop className="dialog-backdrop">
        <Modal.Container placement="auto" scroll="inside" size="lg">
          <Modal.Dialog className={`app-sheet ${className}`}>
            <Modal.CloseTrigger aria-label="Fechar" />
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>{children}</Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
