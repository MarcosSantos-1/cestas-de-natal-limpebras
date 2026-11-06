"use client";
import { useRef } from "react";
import { Button } from "@heroui/react/button";
import { Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Sheet } from "./ui";

const portalUrl = "https://cestas-de-natal-limpebras.vercel.app/";

export function PortalQrSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const code = useRef<SVGSVGElement>(null);
  function downloadQR() {
    if (!code.current) return;
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(code.current)], {
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
    <Sheet open={open} onClose={onClose} title="Compartilhe com a equipe">
      <div className="share-content">
        <p>O QR leva ao portal do colaborador.</p>
        <div className="share-code">
          <QRCodeSVG
            ref={code}
            value={portalUrl}
            size={210}
            marginSize={3}
            title="QR code do portal do colaborador"
          />
        </div>
        <Button fullWidth className="primary-button" onPress={downloadQR}>
          <Download size={19} />
          Baixar QR do portal
        </Button>
        <p className="footnote">{new URL(portalUrl).hostname}</p>
      </div>
    </Sheet>
  );
}
