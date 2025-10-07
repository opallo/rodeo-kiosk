// app/payment-success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"; // 👈 add
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import QRCode from "react-qr-code";

type OkPayload = { ok: true; paid: boolean; session: { id: string } };
type ErrPayload = { ok: false; error: string };
type SessionCheck = OkPayload | ErrPayload;
const isOk = (x: SessionCheck): x is OkPayload => x.ok === true;

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
        { method: "GET", headers: { accept: "application/json" }, credentials: "include" }
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

        <SignedOut>
          <div className="space-y-3 rounded-md border border-neutral-800 p-4">
            <p className="text-sm text-neutral-300">
              Please sign in to view your purchase details.
            </p>
            <SignInButton mode="modal">
              <button className="rounded border border-fuchsia-400/40 bg-fuchsia-900/30 px-4 py-2 text-sm font-semibold">
                Sign in
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          {!sessionId ? (
            <div className="space-y-2">
              <p>
                No <code>session_id</code> in the URL.
              </p>
              <Link href="/test" className="underline">
                Back to test page
              </Link>
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
        </SignedIn>
      </div>
    </main>
  );
}

function TicketViewer({ sessionId }: { sessionId: string }) {
  // Query once we're "paid"
  const ticket = useQuery(api.tickets.getBySessionId, sessionId ? { sessionId } : "skip");

  // 👇 add this local UI state
  const [copied, setCopied] = useState(false);

  if (ticket === undefined) {
    return <p className="text-sm text-emerald-300/80">Looking for your ticket…</p>;
  }
  if (ticket === null) {
    return (
      <>
        <p className="font-medium text-emerald-200">Payment confirmed.</p>
        <p className="text-sm text-emerald-300/80">
          Your ticket isn’t minted yet. This will update automatically.
        </p>
      </>
    );
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(ticket!.ticketId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // no-op; clipboard can be blocked by the browser
    }
  }

  return (
    <div className="space-y-3">
      <p className="font-medium text-emerald-200">Your ticket is ready.</p>

      <div className="rounded border border-emerald-800/60 bg-emerald-900/20 p-3 text-sm">
        <div><span className="opacity-70">Ticket ID:</span> {ticket.ticketId}</div>
        <div><span className="opacity-70">Event:</span> {ticket.eventId}</div>
        <div><span className="opacity-70">Status:</span> {ticket.status}</div>
        <div><span className="opacity-70">Issued:</span> {new Date(ticket.issuedAt).toLocaleString()}</div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={copyId}
          className="rounded border border-emerald-500/40 bg-emerald-900/40 px-3 py-1.5 text-sm font-medium hover:border-emerald-300/60 hover:bg-emerald-800/40"
        >
          {copied ? "Copied!" : "Copy ticket ID"}
        </button>

        <Link
          href="/"
          className="rounded border border-neutral-600/50 bg-neutral-800/40 px-3 py-1.5 text-sm hover:border-neutral-400/60 hover:bg-neutral-800/60"
        >
          Back to debug
        </Link>
      </div>
      {/* QR block — white background helps scanners */}
      <div className="mt-3 inline-flex items-center justify-center rounded-md border border-neutral-800 bg-white p-3">
        <QRCode value={ticket.ticketId} size={160} />
      </div>

    </div>
  );
}

