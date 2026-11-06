"use client";
import { useState } from "react";
import { Button } from "@heroui/react/button";
import { Form } from "@heroui/react/form";
import { ProgressBar } from "@heroui/react/progress-bar";
import {
  ArrowRight,
  PackageCheck,
  Pencil,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { Field, Screen, Sheet } from "./ui";
import { PortalQrSheet } from "./portal-qr-sheet";
import type { AdminController } from "./use-admin";
export default function OverviewScreen({
  controller: c,
  campaignLabel,
}: {
  controller: AdminController;
  campaignLabel: string;
}) {
  const [share, setShare] = useState(false);
  const [editingPending, setEditingPending] = useState(false);
  const calculatedPending = c.stats ? c.stats.total - c.stats.delivered : 0;
  const pending = Math.max(
    0,
    calculatedPending + (c.stats?.pendingAdjustment ?? 0),
  );
  function savePending(count: number | null) {
    void c.task(async () => {
      if (count !== null && (!Number.isSafeInteger(count) || count < 0)) {
        throw new Error(
          "Informe uma quantidade inteira maior ou igual a zero.",
        );
      }
      await c.call("admin.setPendingCount", { count });
      setEditingPending(false);
      await c.refresh();
      c.setNotice("Quantidade de não entregues atualizada.");
    });
  }
  const percent = c.stats?.total
    ? Math.round((c.stats.delivered / c.stats.total) * 100)
    : 0;
  return (
    <Screen id="overview" className="overview-screen">
      <div className="screen-copy compact-copy">
        <div className="overview-kicker">
          <p className="eyebrow">{campaignLabel.toUpperCase()}</p>
          <Button
            variant="ghost"
            isIconOnly
            aria-label="Atualizar resumo"
            onPress={() => void c.task(c.refresh)}
            isDisabled={c.busy}
          >
            <RefreshCw size={19} />
          </Button>
        </div>
        <h1>
          O Natal acontece.
          <br />
          Uma entrega por vez.
        </h1>
      </div>
      <div className="delivery-counter">
        <PackageCheck size={29} />
        <strong>{c.stats?.delivered.toLocaleString("pt-BR") ?? "—"}</strong>
        <span>cestas entregues</span>
        <div className="counter-progress">
          <ProgressBar aria-label="Cestas entregues" value={percent}>
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
          <span>{percent}%</span>
        </div>
      </div>
      <div className="summary-numbers">
        <div>
          <strong>{c.stats?.total.toLocaleString("pt-BR") ?? "—"}</strong>
          <span>colaboradores</span>
        </div>
        <div>
          <Button
            className="pending-count-button"
            variant="ghost"
            aria-label="Editar quantidade de não entregues"
            isDisabled={!c.stats || c.busy}
            onPress={() => setEditingPending(true)}
          >
            <strong>{c.stats ? pending.toLocaleString("pt-BR") : "—"}</strong>
            <span>
              não entregues <Pencil size={12} />
            </span>
          </Button>
        </div>
        <div>
          <strong>{c.stats?.active.toLocaleString("pt-BR") ?? "—"}</strong>
          <span>ativos</span>
        </div>
      </div>
      <p className="overview-note">
        {c.stats?.pendingAdjustment
          ? `Total ajustado manualmente. Pelos cadastros: ${calculatedPending.toLocaleString("pt-BR")}.`
          : "Não entregues inclui cadastros inativos."}
      </p>
      <Button
        fullWidth
        className="primary-button"
        onPress={() => c.navigate("check")}
      >
        Conferir entrega <ArrowRight size={20} />
      </Button>
      <Button
        fullWidth
        variant="outline"
        className="share-button"
        onPress={() => setShare(true)}
      >
        <QrCode size={19} />
        QR do portal público
      </Button>
      <Sheet
        open={editingPending}
        onClose={() => !c.busy && setEditingPending(false)}
        title="Editar não entregues"
      >
        {editingPending ? (
          <Form
            className="access-form"
            onSubmit={(event) => {
              event.preventDefault();
              const value = new FormData(event.currentTarget).get("count");
              savePending(
                typeof value === "string" && value.trim() ? Number(value) : NaN,
              );
            }}
          >
            <p>
              O ajuste vale para o Resumo. As próximas entregas e os novos
              cadastros continuam atualizando a quantidade.
            </p>
            <Field
              name="count"
              label="Quantidade de não entregues"
              inputMode="numeric"
              pattern="[0-9]+"
              defaultValue={String(pending)}
              isRequired
              isDisabled={c.busy}
            />
            <Button
              type="submit"
              className="primary-button"
              fullWidth
              isDisabled={c.busy}
            >
              Salvar quantidade
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onPress={() => savePending(null)}
              isDisabled={c.busy}
            >
              Usar contagem automática
            </Button>
          </Form>
        ) : null}
      </Sheet>
      <PortalQrSheet open={share} onClose={() => setShare(false)} />
    </Screen>
  );
}
