"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react/button";
import { Feedback } from "./ui";
export default function Scanner({
  onRead,
  onClose,
}: {
  onRead: (code: string) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState(""),
    callback = useRef(onRead);
  callback.current = onRead;
  useEffect(() => {
    let disposed = false;
    let scanner: import("html5-qrcode").Html5Qrcode | undefined;
    let started = false;
    let consumed = false;
    void import("html5-qrcode").then(async ({ Html5Qrcode }) => {
      if (disposed) return;
      scanner = new Html5Qrcode("qr-reader");
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (value) => {
            if (!consumed && !disposed) {
              consumed = true;
              callback.current(value);
            }
          },
          () => {},
        );
        started = true;
        if (disposed) await scanner.stop();
      } catch {
        if (!disposed)
          setError(
            "Não foi possível abrir a câmera. Confira a permissão do navegador ou digite o código.",
          );
      }
    });
    return () => {
      disposed = true;
      if (started && scanner) void scanner.stop().catch(() => {});
    };
  }, []);
  return (
    <section className="scanner-panel">
      <div className="section-heading">
        <h3>Ler código com a câmera</h3>
        <Button size="sm" variant="ghost" onPress={onClose}>
          Fechar câmera
        </Button>
      </div>
      <div id="qr-reader" />
      {error ? (
        <Feedback>{error}</Feedback>
      ) : (
        <p className="small-note">
          Aponte para o QR do colaborador. A leitura só abre a conferência.
        </p>
      )}
    </section>
  );
}
