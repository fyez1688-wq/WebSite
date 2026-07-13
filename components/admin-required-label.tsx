import type { ReactNode } from "react";

export function AdminRequiredLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--foreground)]">
      <span>{children}</span>
      {required ? (
        <>
          <span className="text-red-600" aria-hidden="true" title="必填">※</span>
          <span className="sr-only">必填</span>
        </>
      ) : null}
    </span>
  );
}
