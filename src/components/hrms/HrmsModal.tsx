"use client";

import type { ReactNode } from "react";

export function HrmsModal({ children, description, onClose, open, title }: { children: ReactNode; description?: string; onClose: () => void; open: boolean; title: string }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-[#dfe6e2] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#edf1ef] px-6 py-5">
          <div>
            <h2 className="text-2xl font-black text-[#111827]">{title}</h2>
            {description ? <p className="mt-1 text-sm font-semibold leading-6 text-[#6b7280]">{description}</p> : null}
          </div>
          <button className="rounded-full border border-[#dbe0e5] px-3 py-1 text-xl font-black text-[#6b7280] hover:bg-[#f8faf9]" onClick={onClose} type="button" aria-label="Close modal">×</button>
        </div>
        <div className="max-h-[calc(92vh-92px)] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
