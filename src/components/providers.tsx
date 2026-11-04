"use client";
import { I18nProvider } from "react-aria-components";
import { MotionConfig } from "motion/react";
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider locale="pt-BR">
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </I18nProvider>
  );
}
