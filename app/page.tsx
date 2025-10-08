"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { SignInButton, useUser } from "@clerk/nextjs";

import { api } from "@/convex/_generated/api";
import { PRICE_CATALOG } from "@/lib/pricing";
import QRCode from "react-qr-code";

const PRICE_ID = PRICE_CATALOG.generalAdmission.priceId;

function Authorized({ children }: { children: ReactNode }) {
  return <Authenticated>{children}</Authenticated>;
}

function Unauthorized({ children }: { children: ReactNode }) {
  return <Unauthenticated>{children}</Unauthenticated>;
}

function TicketPurchasePanel({ priceId }: { priceId: string }) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "info" | "error"; message: string } | null>(null);

  const totalLabel = useMemo(() => {
    const basePrice = 85;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(basePrice * qty);
  }, [qty]);

  const adjustQuantity = (delta: number) => {
    setQty((current) => Math.max(1, current + delta));
  };

  const handleCheckout = async () => {
    setLoading(true);
    setFeedback({
      tone: "info",
      message: `Preparing checkout for ${qty} ticket${qty === 1 ? "" : "s"}...`,
    });

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, quantity: qty }),
      });

      const { url, error } = await response.json();

      if (error) {
        setFeedback({ tone: "error", message: "Checkout responded with an error. Please try again." });
        return;
      }

      if (!url) {
        setFeedback({
          tone: "error",
          message: "We couldn’t find a checkout session to open. Please try once more.",
        });
        return;
      }

      setFeedback({ tone: "info", message: "Redirecting you to Stripe Checkout..." });
      window.open(url, "_self");
    } catch (error) {
      console.error("Error creating checkout session", error);
      setFeedback({
        tone: "error",
        message: "We hit a network hiccup starting your checkout. Check your connection and retry.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-600">Secure checkout</p>
        <h2 className="text-2xl font-semibold text-stone-900">Pick your tickets</h2>
        <p className="text-sm text-stone-600">
          Tickets are $85 each. Adjust the quantity and we’ll hand you off to Stripe to finish the purchase.
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-2">
          <button
            type="button"
            onClick={() => adjustQuantity(-1)}
            disabled={loading || qty <= 1}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-semibold text-stone-600 transition hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <div className="flex h-11 min-w-[3.5rem] items-center justify-center rounded-xl bg-white px-4 text-lg font-semibold text-stone-900 shadow-inner">
            {qty}
          </div>
          <button
            type="button"
            onClick={() => adjustQuantity(1)}
            disabled={loading}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-semibold text-stone-600 transition hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>

        <div className="flex flex-col items-start gap-1 text-left sm:items-end">
          <span className="text-xs uppercase tracking-[0.24em] text-stone-500">Total</span>
          <span className="text-2xl font-semibold text-amber-700">{totalLabel}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Starting checkout..." : `Purchase ${qty} Ticket${qty === 1 ? "" : "s"}`}
      </button>

      <div className="grid gap-4 sm:grid-cols-3">
        {["Chute-side action", "Secure payment", "Instant delivery"].map((headline, index) => (
          <div key={headline} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
            <p className="font-semibold text-stone-800">{headline}</p>
            <p className="mt-1 text-xs text-stone-500">
              {[
                "Feel the dust fly with premier seating for every ride.",
                "Stripe keeps your payment safe from start to finish.",
                "Check your inbox moments after payment for your tickets.",
              ][index]}
            </p>
          </div>
        ))}
      </div>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-600"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : (
        <p className="text-sm text-stone-500">Need a hand? Find our crew at the front gate for quick help.</p>
      )}
    </section>
  );
}

type PurchaseSummary = {
  stripeSessionId: string;
  createdAt: number;
  amountTotal: number;
  currency: string;
  ticketIds: string[];
  eventId: string;
};

function PurchaseHistory() {
  const purchases = useQuery(api.purchases.listSuccessfulForCurrentUser, {});
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseSummary | null>(null);
  const [activeTicketIndex, setActiveTicketIndex] = useState(0);
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  const formatAmount = useCallback((amountTotal: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountTotal / 100);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedPurchase(null);
    setActiveTicketIndex(0);
    setSwipeStartX(null);
    setCopiedTicketId(null);
  }, []);

  useEffect(() => {
    if (!selectedPurchase) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
      if (event.key === "ArrowRight") {
        setActiveTicketIndex((current) =>
          Math.min(current + 1, Math.max(0, selectedPurchase.ticketIds.length - 1)),
        );
      }
      if (event.key === "ArrowLeft") {
        setActiveTicketIndex((current) => Math.max(0, current - 1));
      }
    };

    document.body.classList.add("overflow-hidden");
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.classList.remove("overflow-hidden");
      window.removeEventListener("keydown", handleKey);
    };
  }, [closeModal, selectedPurchase]);

  useEffect(() => {
    if (!selectedPurchase) {
      setActiveTicketIndex(0);
      setSwipeStartX(null);
      return;
    }

    setActiveTicketIndex(0);
    setSwipeStartX(null);
  }, [selectedPurchase]);

  const openModalForPurchase = useCallback((purchase: PurchaseSummary) => {
    setSelectedPurchase(purchase);
    setActiveTicketIndex(0);
    setSwipeStartX(null);
    setCopiedTicketId(null);
  }, []);

  const goToNextTicket = useCallback(() => {
    if (!selectedPurchase) return;
    setActiveTicketIndex((current) =>
      Math.min(current + 1, Math.max(0, selectedPurchase.ticketIds.length - 1)),
    );
  }, [selectedPurchase]);

  const goToPreviousTicket = useCallback(() => {
    if (!selectedPurchase) return;
    setActiveTicketIndex((current) => Math.max(0, current - 1));
  }, [selectedPurchase]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    setSwipeStartX(event.clientX);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (swipeStartX === null || !selectedPurchase) {
        return;
      }

      const deltaX = event.clientX - swipeStartX;
      const threshold = 48;
      if (Math.abs(deltaX) > threshold) {
        if (deltaX < 0) {
          goToNextTicket();
        } else {
          goToPreviousTicket();
        }
      }

      setSwipeStartX(null);
    },
    [goToNextTicket, goToPreviousTicket, selectedPurchase, swipeStartX],
  );

  const handleCopyTicketId = useCallback((ticketId: string) => {
    if (!navigator?.clipboard) {
      setCopiedTicketId(null);
      return;
    }

    navigator.clipboard
      .writeText(ticketId)
      .then(() => {
        setCopiedTicketId(ticketId);
        setTimeout(() => {
          setCopiedTicketId((current) => (current === ticketId ? null : current));
        }, 1600);
      })
      .catch(() => {
        setCopiedTicketId(null);
      });
  }, []);

  const renderBody = () => {
    if (purchases === undefined) {
      return (
        <tr>
          <td colSpan={4} className="px-4 py-6 text-center text-sm text-stone-500">
            Loading purchase history...
          </td>
        </tr>
      );
    }

    if (purchases.length === 0) {
      return (
        <tr>
          <td colSpan={4} className="px-4 py-6 text-center text-sm text-stone-500">
            No completed purchases yet. Your receipts will land here after checkout.
          </td>
        </tr>
      );
    }

    return purchases.map((purchase) => {
      const ticketIds = purchase.ticketIds;
      const ticketCount = ticketIds.length;
      const amount = formatAmount(purchase.amountTotal, purchase.currency);

      const issuedAt = dateFormatter.format(new Date(purchase.createdAt));

      return (
        <tr
          key={purchase.stripeSessionId}
          className="cursor-pointer border-t border-stone-200 transition hover:bg-amber-50/40 focus-within:bg-amber-50/40"
          onClick={() =>
            openModalForPurchase({
              stripeSessionId: purchase.stripeSessionId,
              amountTotal: purchase.amountTotal,
              currency: purchase.currency,
              createdAt: purchase.createdAt,
              ticketIds: purchase.ticketIds,
              eventId: purchase.eventId,
            })
          }
          tabIndex={0}
          role="button"
          aria-label={`View receipt for purchase on ${issuedAt}`}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openModalForPurchase({
                stripeSessionId: purchase.stripeSessionId,
                amountTotal: purchase.amountTotal,
                currency: purchase.currency,
                createdAt: purchase.createdAt,
                ticketIds: purchase.ticketIds,
                eventId: purchase.eventId,
              });
            }
          }}
        >
          <td className="px-4 py-3 text-sm font-medium text-stone-800">{issuedAt}</td>
          <td className="px-4 py-3 text-sm text-stone-600">{purchase.eventId}</td>
          <td
            className="px-4 py-3 text-sm text-stone-600"
            title={ticketCount > 0 ? ticketIds.join(", ") : undefined}
          >
            {ticketCount > 0 ? `${ticketCount} ticket${ticketCount === 1 ? "" : "s"}` : "Tickets pending"}
          </td>
          <td className="px-4 py-3 text-sm font-semibold text-amber-700">{amount}</td>
        </tr>
      );
    });
  };

  return (
    <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-600">Your receipts</p>
        <h2 className="text-xl font-semibold text-stone-900">Past successful purchases</h2>
        <p className="text-sm text-stone-600">
          Track every paid checkout in one place. We keep the last 20 receipts handy for quick reference.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-stone-200">
        <table className="min-w-full divide-y divide-stone-200 text-left">
          <thead className="bg-stone-50 text-xs uppercase tracking-[0.2em] text-stone-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Purchased
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Event
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Tickets
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">{renderBody()}</tbody>
        </table>
      </div>

      {selectedPurchase ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
          <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-xl space-y-6 rounded-3xl border border-amber-100 bg-white p-6 shadow-2xl">
            <header className="space-y-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-600">Receipt details</p>
                  <h3 className="text-xl font-semibold text-stone-900">{selectedPurchase.eventId}</h3>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-stone-200 hover:text-stone-700"
                  aria-label="Close receipt details"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-stone-500">
                Purchased {dateFormatter.format(new Date(selectedPurchase.createdAt))} · {formatAmount(selectedPurchase.amountTotal, selectedPurchase.currency)}
              </p>
              <p className="text-xs uppercase tracking-[0.28em] text-stone-400">Session {selectedPurchase.stripeSessionId}</p>
            </header>

            {selectedPurchase.ticketIds.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-6 text-center text-sm text-amber-700">
                Tickets are still minting for this purchase. Check back in a moment and they’ll appear here automatically.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                  <span>
                    Ticket {activeTicketIndex + 1} of {selectedPurchase.ticketIds.length}
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <span className="hidden sm:inline">Swipe</span>
                    <span aria-hidden className="text-lg">⟷</span>
                    <span className="sm:hidden">Swipe</span>
                  </span>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={goToPreviousTicket}
                    disabled={activeTicketIndex === 0}
                    aria-label="View previous ticket"
                    className="group absolute left-2 top-1/2 -translate-y-1/2 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-40"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-600 text-xl text-white shadow-lg ring-4 ring-amber-600/20 transition active:scale-95 group-hover:bg-amber-700">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-6 w-6"
                      >
                        <path
                          d="M15.75 19.5 8.25 12l7.5-7.5"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.75}
                        />
                      </svg>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={goToNextTicket}
                    disabled={activeTicketIndex === selectedPurchase.ticketIds.length - 1}
                    aria-label="View next ticket"
                    className="group absolute right-2 top-1/2 -translate-y-1/2 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-40"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-600 text-xl text-white shadow-lg ring-4 ring-amber-600/20 transition active:scale-95 group-hover:bg-amber-700">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-6 w-6"
                      >
                        <path
                          d="m8.25 4.5 7.5 7.5-7.5 7.5"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.75}
                        />
                      </svg>
                    </span>
                  </button>
                  <div
                    className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50"
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={() => setSwipeStartX(null)}
                  >
                    <div
                      className="flex transition-transform duration-300 ease-out"
                      style={{ transform: `translateX(-${activeTicketIndex * 100}%)` }}
                    >
                      {selectedPurchase.ticketIds.map((ticketId) => (
                        <div key={ticketId} className="flex w-full shrink-0 flex-col items-center gap-6 p-6">
                          <div className="rounded-3xl bg-white p-4 shadow-inner">
                            <QRCode value={ticketId} size={192} />
                          </div>
                          <div className="space-y-2 text-center text-sm text-stone-600">
                            <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Ticket code</p>
                            <p className="font-semibold text-stone-900">{ticketId}</p>
                            <p>Show this code at the gate. The QR above is ready to scan.</p>
                            <button
                              type="button"
                              onClick={() => handleCopyTicketId(ticketId)}
                              className="inline-flex items-center justify-center rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow transition hover:bg-amber-700"
                            >
                              {copiedTicketId === ticketId ? "Copied" : "Copy code"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-center gap-2">
                    {selectedPurchase.ticketIds.map((ticketId, index) => (
                      <button
                        key={ticketId}
                        type="button"
                        onClick={() => setActiveTicketIndex(index)}
                        className={`h-2.5 w-2.5 rounded-full transition ${
                          index === activeTicketIndex
                            ? "scale-110 bg-amber-600"
                            : "bg-stone-200 hover:bg-stone-300"
                        }`}
                        aria-label={`Show ticket ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function BuyPage() {
  const { user } = useUser();
  const welcomeName = user?.firstName || user?.fullName || user?.primaryEmailAddress?.emailAddress || "friend";

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 via-amber-50/40 to-white text-stone-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-6 pb-24 pt-16">
        <Unauthorized>
          <section className="space-y-8">
            <div className="space-y-6 rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-lg shadow-amber-100/50">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">Canyon Classic Rodeo</p>
              <h1 className="text-4xl font-semibold leading-tight text-stone-900 sm:text-5xl">
                Saddle up for a dust-kicking night under the arena lights.
              </h1>
              <p className="text-lg text-stone-600">
                From bronc busting to barrel racing, the Canyon Classic delivers the best show in the valley. Sign in to grab
                your seats before the gates open.
              </p>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <SignInButton mode="modal">
                  <button className="inline-flex items-center justify-center rounded-2xl bg-amber-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                    Purchase your tickets
                  </button>
                </SignInButton>
                <span className="text-sm text-stone-500">No account yet? You can create one during sign-in.</span>
              </div>
            </div>
            <dl className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Dates", value: "July 18 – 20" },
                { label: "Location", value: "Canyon County Fairgrounds" },
                { label: "Highlights", value: "Pro riders · Live music · Local eats" },
              ].map((item) => (
                <div key={item.label} className="space-y-2 rounded-3xl border border-amber-100 bg-white/70 p-5 text-center">
                  <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-600">{item.label}</dt>
                  <dd className="text-base font-semibold text-stone-800">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </Unauthorized>

        <Authorized>
          <section className="space-y-10">
            <header className="space-y-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-600">Welcome back</p>
              <h1 className="text-4xl font-semibold text-stone-900 sm:text-5xl">Ready to ride, {welcomeName}?</h1>
              <p className="mx-auto max-w-2xl text-lg text-stone-600">
                Choose how many tickets you need, head through checkout, and we’ll have your confirmation waiting below the moment
                Stripe marks it paid.
              </p>
            </header>

            <div className="space-y-8">
              <TicketPurchasePanel priceId={PRICE_ID} />
              <PurchaseHistory />
            </div>
          </section>
        </Authorized>
      </div>
    </main>
  );
}
