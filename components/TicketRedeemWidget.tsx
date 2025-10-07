// components/RedeemWidget.tsx
"use client";

import { useState } from "react";

type RedeemSuccess = { ok: true; code: "ok"; ticketId: string };
type RedeemFailureCode = {
  ok: false;
  code: "invalid" | "already_used" | "void" | "refunded";
};
type RedeemFailureMessage = { ok: false; error: string };
type RedeemPayload = RedeemSuccess | RedeemFailureCode | RedeemFailureMessage;
type RedeemState = { status: number; data: RedeemPayload };

export default function TicketRedeemWidget() {
  const [ticketId, setTicketId] = useState("");
  const [kioskId, setKioskId] = useState("front-gate-1");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<RedeemState | null>(null);

  async function redeem() {
    setBusy(true);
    setOut(null);
    try {
      const res = await fetch("/api/tickets/redeem", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        credentials: "include", // Clerk cookie → role gate enforced
        body: JSON.stringify({ ticketId: ticketId.trim(), kioskId: kioskId.trim() }),
      });
      const data = await res.json();
      setOut({ status: res.status, data });
    } catch (e) {
      setOut({ status: 0, data: { ok: false, error: e instanceof Error ? e.message : String(e) } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-neutral-800 bg-neutral-950/70 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-emerald-200">Redeem ticket</h2>
        <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
          Clerk role: <span className="font-semibold">kiosk</span> required
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          placeholder="ticket id (from QR)"
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none"
        />
        <input
          value={kioskId}
          onChange={(e) => setKioskId(e.target.value)}
          placeholder="kiosk id"
          className="w-48 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none"
        />
        <button
          onClick={redeem}
          disabled={!ticketId || !kioskId || busy}
          className="rounded border border-emerald-500/40 bg-emerald-900/40 px-3 py-2 text-sm font-medium hover:border-emerald-300/60 hover:bg-emerald-800/40 disabled:opacity-50"
        >
          {busy ? "Redeeming…" : "Redeem"}
        </button>
      </div>

      <pre className="h-40 overflow-y-auto border border-emerald-500/20 bg-neutral-950/80 p-3 text-xs leading-relaxed text-emerald-100">
        {out ? JSON.stringify(out, null, 2) : "Result will appear here."}
      </pre>
      <p className="text-xs text-neutral-400">
        Tip: first scan should return <code>{"{ ok: true, code: \"ok\" }"}</code>. Scanning again should return <code>{"{ ok: false, code: \"already_used\" }"}</code>.
      </p>
    </div>
  );
}
