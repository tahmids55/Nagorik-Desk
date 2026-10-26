import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex min-h-[calc(100vh-14rem)] w-full max-w-[460px] flex-col justify-center px-4 py-10">{children}</div>;
}
