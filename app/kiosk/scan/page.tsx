"use client";

import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";

type RedeemSuccess = { ok: true; code: "ok"; ticketId: string };
type RedeemFailureCode = {
  ok: false;
  code: "invalid" | "already_used" | "void" | "refunded";
};
type RedeemFailureMessage = { ok: false; error: string };
type RedeemPayload = RedeemSuccess | RedeemFailureCode | RedeemFailureMessage;
type RedeemState = { status: number; data: RedeemPayload };

export default function KioskScanPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold">Ticket Scanner</h1>

        <SignedOut>
          <div className="rounded-md border border-neutral-800 p-4">
            <p className="mb-3 text-sm text-neutral-300">
              Please sign in to use the scanner.
            </p>
            <SignInButton mode="modal">
              <button className="rounded border border-fuchsia-400/40 bg-fuchsia-900/30 px-4 py-2 text-sm font-semibold">
                Sign in
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <RoleGate />
        </SignedIn>

        <Link href="/" className="underline text-sm">
          Back to debug
        </Link>
      </div>
    </main>
  );
}

function RoleGate() {
  const { user } = useUser();
  const roles = (user?.publicMetadata?.roles as string[] | undefined) ?? [];
  const allowed = roles.includes("kiosk");
  if (!allowed) {
    return (
      <div className="rounded-md border border-red-900 bg-red-950/40 p-4">
        <p className="font-medium text-red-200">Forbidden</p>
        <p className="text-sm text-red-300/80">
          Your account doesn’t have the <code>kiosk</code> role.
        </p>
      </div>
    );
  }
  return <Scanner />;
}

function Scanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const [kioskId, setKioskId] = useState("front-gate-1");
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<RedeemState | null>(null);

  // De-dupe recent scans for a few seconds
  const recent = useRef<Map<string, number>>(new Map());
  function recentlySeen(code: string, ms = 3000) {
    const now = Date.now();
    for (const [k, t] of Array.from(recent.current)) {
      if (now - t > ms) recent.current.delete(k);
    }
    const seen = recent.current.has(code);
    recent.current.set(code, now);
    return seen;
  }

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();

    (async () => {
      try {
        // Try facingMode first
        try {
          const controls = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: "environment" } } },
            videoRef.current!,
            (result) => {
              if (!result || busy) return;
              const text = result.getText().trim();
              if (!text || recentlySeen(text)) return;
              onDecode(text);
            }
          );
          controlsRef.current = controls;
          return;
        } catch {
          // fall through to deviceId selection
        }

        // Fallback: pick a deviceId that looks like back/rear
        const deviceId = await pickBestBackCameraDeviceId();
        const controls = await reader.decodeFromVideoDevice(
          deviceId,                // undefined = let ZXing choose default
          videoRef.current!,
          (result) => {
            if (!result || busy) return;
            const text = result.getText().trim();
            if (!text || recentlySeen(text)) return;
            onDecode(text);
          }
        );
        controlsRef.current = controls;
      } catch (e) {
        setOut({
          status: 0,
          data: { ok: false, error: (e as Error)?.message ?? "Camera error" },
        });
      }
    })();

    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  async function onDecode(ticketId: string) {
    setLastScan(ticketId);
    setBusy(true);
    setOut(null);
    try {
      const res = await fetch("/api/tickets/redeem", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ ticketId, kioskId }),
      });
      const data = await res.json();
      setOut({ status: res.status, data });
    } catch (e) {
      setOut({
        status: 0,
        data: { ok: false, error: e instanceof Error ? e.message : String(e) },
      });
    } finally {
      setTimeout(() => setBusy(false), 600);
    }
  }

  return (
    <div className="rounded-md border border-neutral-800 p-4 space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs text-neutral-400 mb-1">Kiosk ID</label>
          <input
            value={kioskId}
            onChange={(e) => setKioskId(e.target.value)}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none"
            placeholder="front-gate-1"
          />
        </div>
        <div className="text-xs text-neutral-400">
          {busy ? "Redeeming…" : lastScan ? `Last scan: ${lastScan}` : "Waiting for scan…"}
        </div>
      </div>

      <div className="aspect-video w-full overflow-hidden rounded border border-neutral-800 bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      </div>

      <pre className="h-40 overflow-y-auto border border-emerald-500/20 bg-neutral-950/80 p-3 text-xs leading-relaxed text-emerald-100">
        {out ? JSON.stringify(out, null, 2) : "Scan a QR code to redeem…"}
      </pre>

      <div className="text-xs text-neutral-400">
        Tip: first scan should return <code>{"{ ok: true, code: \"ok\" }"}</code>. Scanning it
        again should return <code>{"{ ok: false, code: \"already_used\" }"}</code>.
      </div>
    </div>
  );
}

// Helper: choose a back camera by label; fallback to last device
async function pickBestBackCameraDeviceId(): Promise<string | undefined> {
  try {
    const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
    tmp.getTracks().forEach((t) => t.stop());
  } catch {
    // ignore
  }
  const devices = await BrowserMultiFormatReader.listVideoInputDevices();
  if (!devices.length) return undefined;

  const backish = devices.find((d) => /back|rear|environment/i.test(d.label));
  return backish?.deviceId ?? devices[devices.length - 1]?.deviceId ?? undefined;
}
