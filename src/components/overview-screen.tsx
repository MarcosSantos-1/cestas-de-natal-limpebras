"use client";
import { useEffect, useState } from "react";
import { Button } from "@heroui/react/button";
import { ProgressBar } from "@heroui/react/progress-bar";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRight,
  Download,
  PackageCheck,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { Screen, Sheet } from "./ui";
import type { AdminController } from "./use-admin";
export default function OverviewScreen({
  controller: c,
  campaignLabel,
}: {
  controller: AdminController;
  campaignLabel: string;
}) {
  const [url, setUrl] = useState(""),
    [share, setShare] = useState(false);
  useEffect(() => setUrl(window.location.origin), []);
  const percent = c.stats?.total
    ? Math.round((c.stats.delivered / c.stats.total) * 100)
    : 0;
  function downloadQR() {
    const svg = document.querySelector(".share-code svg");
    if (!svg) return;
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svg)], {
        type: "image/svg+xml",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "qr-portal-cestas.svg";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
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
          <strong>
            {c.stats
              ? (c.stats.total - c.stats.delivered).toLocaleString("pt-BR")
              : "—"}
          </strong>
          <span>não entregues</span>
        </div>
        <div>
          <strong>{c.stats?.active.toLocaleString("pt-BR") ?? "—"}</strong>
          <span>ativos</span>
        </div>
      </div>
      <p className="overview-note">Não entregues inclui cadastros inativos.</p>
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
        open={share}
        onClose={() => setShare(false)}
        title="Compartilhe com a equipe"
      >
        <div className="share-content">
          <p>O QR leva ao portal do colaborador.</p>
          {url ? (
            <div className="share-code">
              <QRCodeSVG value={url} size={210} marginSize={3} />
            </div>
          ) : null}
          <Button fullWidth className="primary-button" onPress={downloadQR}>
            <Download size={19} />
            Baixar QR do portal
          </Button>
          <p className="footnote">
            Imprima o QR gerado no endereço definitivo.
          </p>
        </div>
      </Sheet>
    </Screen>
  );
}
