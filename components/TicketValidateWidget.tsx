// components/TicketValidateWidget.tsx
"use client";

import { useState } from "react";

type TicketSummary = {
  ticketId: string;
  eventId: string;
  status: string;
  issuedAt: number;
};
type ValidateFound = { ok: true; found: true; ticket: TicketSummary };
type ValidateNotFound = { ok: true; found: false };
type ValidateError = { ok: false; error: string };
type ValidateResult = ValidateFound | ValidateNotFound | ValidateError;

export default function TicketValidateWidget() {
  const [ticketId, setTicketId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ValidateResult | null>(null);

  async function onCheck() {
    if (!ticketId) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/tickets/validate?ticketId=${encodeURIComponent(ticketId)}`, {
        method: "GET",
        headers: { accept: "application/json" },
        credentials: "include", // Clerk auth cookie
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 bg-neutral-950/70 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-emerald-200">Validate ticket</h2>
        <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
          Read-only lookup via /api/tickets/validate
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          placeholder="paste ticket id (from QR)"
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none"
        />
        <button
          onClick={onCheck}
          disabled={!ticketId || busy}
          className="rounded border border-emerald-500/40 bg-emerald-900/40 px-3 py-2 text-sm font-medium hover:border-emerald-300/60 hover:bg-emerald-800/40 disabled:opacity-50"
        >
          {busy ? "Checking…" : "Check"}
        </button>
      </div>

      <pre className="h-40 overflow-y-auto border border-emerald-500/20 bg-neutral-950/80 p-3 text-xs leading-relaxed text-emerald-100">
        {result ? JSON.stringify(result, null, 2) : "Result will appear here."}
      </pre>
    </div>
  );
}
