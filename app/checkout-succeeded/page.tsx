"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

type TicketDoc = Doc<"tickets">;

function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleString();
}

type QRCodeRenderOptions = {
  width?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  margin?: number;
};

interface QRCodeGlobal {
  toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeRenderOptions
  ): Promise<void>;
}

declare global {
  interface Window {
    QRCode?: QRCodeGlobal;
    __qrCodePromise?: Promise<QRCodeGlobal>;
  }
}

function loadQRCodeLibrary(): Promise<QRCodeGlobal> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("QR code generation requires a browser environment"));
  }

  if (window.QRCode) {
    return Promise.resolve(window.QRCode);
  }

  if (window.__qrCodePromise) {
    return window.__qrCodePromise;
  }

  window.__qrCodePromise = new Promise<QRCodeGlobal>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-qr-lib]");
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.QRCode) {
          resolve(window.QRCode);
        } else {
          reject(new Error("QR code library failed to initialize"));
        }
      });
      existing.addEventListener("error", () => {
        reject(new Error("Failed to load QR code library"));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.qrLib = "true";
    script.addEventListener("load", () => {
      if (window.QRCode) {
        resolve(window.QRCode);
      } else {
        reject(new Error("QR code library failed to initialize"));
      }
    });
    script.addEventListener("error", () => {
      reject(new Error("Failed to load QR code library"));
    });
    document.head.appendChild(script);
  });

  return window.__qrCodePromise;
}

function TicketQr({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const QRCode = await loadQRCodeLibrary();
        if (cancelled || !canvasRef.current) {
          return;
        }

        const canvas = canvasRef.current;
        const size = 168;
        canvas.width = size;
        canvas.height = size;
        await QRCode.toCanvas(canvas, value, {
          width: size,
          margin: 1,
          color: {
            dark: "#bbf7d0",
            light: "#00000000",
          },
        });
        setError(null);
      } catch (err) {
        console.error("Failed to render QR code", err);
        if (!cancelled) {
          setError("Unable to render QR code");
        }
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [value]);

  if (error) {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
        {error}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-label="Ticket QR code"
      className="self-center rounded-lg border border-emerald-500/40 bg-neutral-950"
      style={{ width: 168, height: 168 }}
    />
  );
}

export default function CheckoutSucceededPage() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  const tickets: TicketDoc[] | undefined = useQuery(
    api.ticketsPublic.listBySession,
    sessionId ? { stripeSessionId: sessionId } : "skip"
  );

  const heading = useMemo(() => {
    if (!sessionId) return "Missing session";
    return "Checkout complete";
  }, [sessionId]);

  let content: ReactNode;

  if (!sessionId) {
    content = (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
        Unable to load tickets because the checkout session id is missing from the URL.
      </div>
    );
  } else if (tickets === undefined) {
    content = (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
        Waiting for webhook fulfillment… This page will refresh automatically when tickets arrive.
      </div>
    );
  } else if (tickets.length === 0) {
    content = (
      <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-4 text-sm text-sky-100">
        No tickets minted yet. Stripe may retry the webhook—refresh shortly or check the Convex dashboard.
      </div>
    );
  } else {
    content = (
      <ul className="grid gap-6 sm:grid-cols-2">
        {tickets.map((ticket) => (
          <li
            key={ticket._id}
            className="flex flex-col gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-100"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-[0.28em] text-emerald-200/70">
                Ticket ID
              </span>
              <span className="break-all font-mono text-base text-white">{ticket.ticketId}</span>
            </div>
            <TicketQr value={ticket.ticketId} />
            <div className="flex flex-col gap-1 text-xs text-emerald-200/80">
              <span>Event: {ticket.eventId}</span>
              <span>Status: {ticket.status}</span>
              <span>Issued: {formatTimestamp(ticket.issuedAt)}</span>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 py-12 text-neutral-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-white">{heading}</h1>
          <p className="text-sm text-neutral-400">
            Session <span className="font-mono text-neutral-200">{sessionId ?? "n/a"}</span>
          </p>
          <p className="text-sm text-neutral-400">
            Tickets are issued after Stripe confirms your payment via webhook delivery.
          </p>
        </header>
        {content}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:text-white"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
