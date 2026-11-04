import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/providers";
export const metadata: Metadata = {
  title: "Natal que aproxima · Limpebras",
  description: "Consulte e acompanhe a retirada da sua cesta de Natal.",
  robots: { index: false, follow: false },
  icons: { icon: "/logotipo.png", apple: "/logotipo.png" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
