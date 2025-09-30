"use client";

import { useState } from "react";

export type BuyTicketButtonDebugEntry = {
  type: "request" | "success" | "error";
  message: string;
  payload?: unknown;
  timestamp: string;
};

export type BuyTicketButtonProps = {
  priceId: string;
  onDebug?: (entry: BuyTicketButtonDebugEntry) => void;
};

export default function BuyTicketButton({ priceId, onDebug }: BuyTicketButtonProps) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const emitDebug = (entry: Omit<BuyTicketButtonDebugEntry, "timestamp">) => {
    onDebug?.({ ...entry, timestamp: new Date().toISOString() });
  };

  const handleClick = async () => {
    setLoading(true);
    emitDebug({
      type: "request",
      message: `Creating checkout session for ${qty} ticket${qty === 1 ? "" : "s"}.`,
      payload: { priceId, quantity: qty },
    });

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId, quantity: qty }),
      });

      const { url, error } = await res.json();

      if (error) {
        emitDebug({
          type: "error",
          message: "Checkout API returned an error.",
          payload: error,
        });
      } else if (url) {
        emitDebug({
          type: "success",
          message: "Redirecting to Stripe Checkout.",
          payload: { url },
        });
        window.open(url, "_blank");
      } else {
        emitDebug({
          type: "error",
          message: "Checkout API response missing redirect URL.",
          payload: { response: { url, error } },
        });
      }
    } catch (err) {
      emitDebug({
        type: "error",
        message: "Network error calling checkout API.",
        payload: err,
      });
      console.error("fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const adjustQuantity = (delta: number) => {
    setQty((current) => Math.max(1, current + delta));
  };

  return (
    <div className="grid gap-4 rounded-xl border border-sky-500/20 bg-sky-900/15 p-5 text-sm text-sky-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-widest text-sky-300/70">Stripe checkout</span>
          <span className="font-medium text-white">Configure and launch</span>
        </div>
        <span className="rounded-full border border-sky-500/30 bg-sky-900/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
          Qty {qty}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-950/60 p-1">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-sky-900/40 text-lg font-semibold text-sky-200 transition hover:bg-sky-800/50 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => adjustQuantity(-1)}
            disabled={loading || qty <= 1}
          >
            -
          </button>
          <span className="min-w-[2rem] text-center text-base font-semibold text-white">{qty}</span>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-sky-900/40 text-lg font-semibold text-sky-200 transition hover:bg-sky-800/50 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => adjustQuantity(1)}
            disabled={loading}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="inline-flex min-w-[100px] flex-1 items-center justify-center gap-2 rounded-lg border border-sky-400/40 bg-sky-500/20 px-4 py-3 text-base font-semibold text-white transition hover:border-sky-200/60 hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Processing..." : `Buy ${qty} Ticket${qty === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
