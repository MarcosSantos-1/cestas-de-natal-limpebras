"use client";
import { I18nProvider } from "react-aria-components";
import { MotionConfig } from "motion/react";
import { Toast } from "@heroui/react/toast";
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider locale="pt-BR">
      <MotionConfig reducedMotion="user">
        {children}
        <Toast.Provider
          placement="top end"
          maxVisibleToasts={3}
          width="min(400px, calc(100vw - 28px))"
          className="app-toasts"
        />
      </MotionConfig>
    </I18nProvider>
  );
}
