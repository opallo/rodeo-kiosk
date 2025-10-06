// app/payment-success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type OkPayload = {
  ok: true;
  paid: boolean;
  session: { id: string };
};
type ErrPayload = {
  ok: false;
  error: string;
};
type SessionCheck = OkPayload | ErrPayload;

function isOk(x: SessionCheck): x is OkPayload {
  return x.ok === true;
}

export default function PaymentSuccess() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] =
    useState<"idle" | "loading" | "error" | "unpaid" | "paid">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    (async () => {
      setStatus("loading");
      setError(null);

      const res = await fetch(
        `/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`,
        {
          method: "GET",
          headers: { accept: "application/json" },
          credentials: "include",
        }
      );

      const data = (await res.json()) as SessionCheck;
      if (cancelled) return;

      if (!res.ok) {
        setStatus("error");
        setError(`HTTP ${res.status}`);
        return;
      }

      if (!isOk(data)) {
        setStatus("error");
        setError(data.error);
        return;
      }

      setStatus(data.paid ? "paid" : "unpaid");
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Thanks! Checking your ticket…</h1>

        {!sessionId ? (
          <div className="space-y-2">
            <p>No <code>session_id</code> in the URL.</p>
            <Link href="/test" className="underline">Back to test page</Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-neutral-400">
              Session: <code>{sessionId}</code>
            </p>

            {status === "loading" && (
              <div className="rounded-md border border-neutral-800 p-4">
                Verifying purchase…
              </div>
            )}

            {status === "error" && (
              <div className="rounded-md border border-red-900 bg-red-950/40 p-4">
                <p className="font-medium text-red-200">Couldn’t verify session.</p>
                <p className="text-sm text-red-300/80">{error}</p>
              </div>
            )}

            {status === "unpaid" && (
              <div className="rounded-md border border-yellow-900 bg-yellow-950/30 p-4">
                <p className="font-medium text-yellow-200">Payment not completed yet.</p>
                <p className="text-sm text-yellow-300/80">
                  If you just paid, give it a moment—Stripe may still be finishing up.
                </p>
              </div>
            )}

            {status === "paid" && (
              <div
                id="ticket-slot"
                className="rounded-md border border-emerald-900 bg-emerald-950/30 p-4"
              >
                <TicketViewer sessionId={sessionId} />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function TicketViewer({ sessionId }: { sessionId: string }) {
  // Only query when we actually have a session id
  const ticket = useQuery(api.tickets.getBySessionId, sessionId ? { sessionId } : "skip");

  if (ticket === undefined) {
    return <p className="text-sm text-emerald-300/80">Looking for your ticket…</p>;
  }
  if (ticket === null) {
    return (
      <>
        <p className="font-medium text-emerald-200">Payment confirmed.</p>
        <p className="text-sm text-emerald-300/80">
          Your ticket isn’t minted yet. This will refresh automatically when the webhook writes it.
        </p>
      </>
    );
  }

  return (
    <div className="space-y-2">
      <p className="font-medium text-emerald-200">Your ticket is ready.</p>
      <div className="rounded border border-emerald-800/60 bg-emerald-900/20 p-3 text-sm">
        <div><span className="opacity-70">Ticket ID:</span> {ticket.ticketId}</div>
        <div><span className="opacity-70">Event:</span> {ticket.eventId}</div>
        <div><span className="opacity-70">Status:</span> {ticket.status}</div>
        <div><span className="opacity-70">Issued:</span> {new Date(ticket.issuedAt).toLocaleString()}</div>
      </div>
      {/* Later: add a "View / Download" button or QR render here */}
    </div>
  );
}
