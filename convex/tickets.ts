// convex/tickets.ts
import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// PUBLIC QUERY: read a ticket by its Stripe Checkout Session id
export const getBySessionId = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", sessionId))
      .collect();

    return tickets.map((ticket) => ({
      id: ticket._id,
      ticketId: ticket.ticketId,
      eventId: ticket.eventId,
      status: ticket.status,
      issuedAt: ticket.issuedAt,
    }));
  },
});

// INTERNAL MUTATION: mint a ticket for a paid Checkout Session (idempotent by sessionId)
export const mintFromCheckoutSession = internalMutation({
  args: {
    sessionId: v.string(),       // Stripe Checkout Session id (cs_...)
    eventId: v.string(),         // your internal event key
    tokenIdentifier: v.string(), // Clerk tokenIdentifier (owner)
    amountTotal: v.number(),     // cents
    currency: v.string(),        // "usd"
    created: v.number(),         // Stripe event.created (seconds epoch)
    quantity: v.number(),        // number of tickets sold in this session
  },
  handler: async (ctx, args) => {
    console.log("[tickets.mint] start", {
      sessionId: args.sessionId,
      eventId: args.eventId,
      amountTotal: args.amountTotal,
      currency: args.currency,
      created: args.created,
      quantity: args.quantity,
    });
    // Idempotency: load all tickets for this session and only mint what we're missing.
    const existingTickets = await ctx.db
      .query("tickets")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", args.sessionId))
      .collect();

    // Also upsert a purchase row keyed by session
    const existingPurchase = await ctx.db
      .query("purchases")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", args.sessionId))
      .first();

    const alreadyMintedSummaries = existingTickets.map((ticket) => ({
      ticketId: ticket.ticketId,
      _id: ticket._id,
    }));

    const targetQuantity = Math.max(1, Math.floor(args.quantity));
    const remainingToMint = Math.max(0, targetQuantity - existingTickets.length);

    const mintedTickets: { ticketId: string; _id: Id<"tickets"> }[] = [];

    if (remainingToMint > 0) {
      const nowMs = Date.now();
      for (let i = 0; i < remainingToMint; i++) {
        const ticketCode =
          Math.random().toString(36).slice(2, 12) +
          Math.random().toString(36).slice(2, 12);

        const ticketDocId = await ctx.db.insert("tickets", {
          ticketId: ticketCode,
          eventId: args.eventId,
          ownerTokenIdentifier: args.tokenIdentifier,
          emailSnapshot: undefined,
          stripeSessionId: args.sessionId,
          status: "active",
          validFrom: undefined,
          validTo: undefined,
          issuedAt: nowMs,
          redeemedAt: undefined,
          redeemedByKioskId: undefined,
          emailSentAt: undefined,
          emailProviderMessageId: undefined,
        });

        mintedTickets.push({ ticketId: ticketCode, _id: ticketDocId });
      }
    }

    const allTickets = [...alreadyMintedSummaries, ...mintedTickets];

    const purchaseTicketIds = allTickets.map((ticket) => ticket.ticketId);

    if (!existingPurchase) {
      await ctx.db.insert("purchases", {
        stripeSessionId: args.sessionId,
        eventId: args.eventId,
        tokenIdentifier: args.tokenIdentifier,
        amountTotal: args.amountTotal,
        currency: args.currency,
        paymentStatus: "paid",
        customerId: undefined,
        createdAt: args.created * 1000, // s → ms
        ticketIds: purchaseTicketIds,
      });
    } else {
      const previousTicketIds = Array.isArray(existingPurchase.ticketIds)
        ? [...existingPurchase.ticketIds]
        : [];
      const legacyTicketId = (existingPurchase as unknown as { ticketId?: string }).ticketId;
      if (legacyTicketId && !previousTicketIds.includes(legacyTicketId)) {
        previousTicketIds.push(legacyTicketId);
      }

      const mergedTicketIds = Array.from(new Set([...previousTicketIds, ...purchaseTicketIds]));

      await ctx.db.patch(existingPurchase._id, {
        ticketIds: mergedTicketIds,
        paymentStatus: "paid",
        ticketId: undefined,
      });
    }

    if (mintedTickets.length === 0) {
      console.log("[tickets.mint] already minted", {
        sessionId: args.sessionId,
        ticketIds: allTickets.map((ticket) => ticket.ticketId),
      });
    } else {
      console.log("[tickets.mint] minted", {
        sessionId: args.sessionId,
        ticketIds: mintedTickets.map((ticket) => ticket.ticketId),
        ticketDocIds: mintedTickets.map((ticket) => ticket._id),
      });
    }

    console.log("[tickets.mint] purchase upserted/updated", { sessionId: args.sessionId });

    return { mintedCount: mintedTickets.length, tickets: allTickets };
  },
});

// Read one ticket by its public ticket code (QR payload)
export const getByTicketId = query({
  args: { ticketId: v.string() },
  handler: async (ctx, { ticketId }) => {
    const t = await ctx.db
      .query("tickets")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", ticketId))
      .first();

    if (!t) return null;

    // Minimal, safe shape for validators
    return {
      ticketId: t.ticketId,
      eventId: t.eventId,
      status: t.status,
      issuedAt: t.issuedAt,
      // (no owner or email fields exposed)
    };
  },
});

// Put these near the top of convex/tickets.ts (once per file is fine)
type RedeemOk = { ok: true; code: "ok"; ticketId: string };
type RedeemErr = { ok: false; code: "invalid" | "already_used" | "void" | "refunded" };
type RedeemResult = RedeemOk | RedeemErr;

// INTERNAL: redeem a ticket (mark "used") and write an audit trail
export const redeem = internalMutation({
  args: {
    ticketId: v.string(),
    kioskId: v.string(),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  // 👇 Explicit return type avoids the need for `as const` on expressions
  handler: async (ctx, { ticketId, kioskId, ip, userAgent }): Promise<RedeemResult> => {
    const now = Date.now();

    const t = await ctx.db
      .query("tickets")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", ticketId))
      .first();

    if (!t) {
      await ctx.db.insert("redemptions", {
        ticketId,
        kioskId,
        redeemedAt: now,
        ip,
        userAgent,
        // schema supports: "ok" | "already_used" | "invalid"
        result: "invalid",
      });
      return { ok: false, code: "invalid" };
    }

    // Only "active" tickets can be redeemed
    if (t.status !== "active") {
      // Map non-active statuses to a stable failure code for return/UI.
      // We store "already_used" in the audit row for any non-active case.
      const failCode: RedeemErr["code"] =
        t.status === "used" ? "already_used" : t.status; // "void" or "refunded"

      await ctx.db.insert("redemptions", {
        ticketId: t.ticketId,
        kioskId,
        redeemedAt: now,
        ip,
        userAgent,
        result: "already_used", // audit trail: covers used/void/refunded for scanners
      });

      return { ok: false, code: failCode };
    }

    // Mark used + stamp who redeemed it
    await ctx.db.patch(t._id, {
      status: "used",
      redeemedAt: now,
      redeemedByKioskId: kioskId,
    });

    await ctx.db.insert("redemptions", {
      ticketId: t.ticketId,
      kioskId,
      redeemedAt: now,
      ip,
      userAgent,
      result: "ok",
    });

    return { ok: true, code: "ok", ticketId: t.ticketId };
  },
});
