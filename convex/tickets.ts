// convex/tickets.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getByStripeSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { status: "unauthenticated" as const };
    }

    const purchase = await ctx.db
      .query("purchases")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", sessionId))
      .first();

    if (!purchase) {
      return { status: "not_found" as const };
    }

    if (purchase.tokenIdentifier !== identity.tokenIdentifier) {
      return { status: "forbidden" as const };
    }

    const ticket = await ctx.db
      .query("tickets")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", sessionId))
      .first();

    if (!ticket) {
      return {
        status: "pending" as const,
        purchase: {
          createdAt: purchase.createdAt,
          paymentStatus: purchase.paymentStatus,
          amountTotal: purchase.amountTotal,
          currency: purchase.currency,
        },
      };
    }

    if (ticket.ownerTokenIdentifier !== identity.tokenIdentifier) {
      return { status: "forbidden" as const };
    }

    return {
      status: "ready" as const,
      ticket: {
        ticketId: ticket.ticketId,
        eventId: ticket.eventId,
        status: ticket.status,
        issuedAt: ticket.issuedAt,
        validFrom: ticket.validFrom ?? null,
        validTo: ticket.validTo ?? null,
      },
      purchase: {
        createdAt: purchase.createdAt,
        paymentStatus: purchase.paymentStatus,
        amountTotal: purchase.amountTotal,
        currency: purchase.currency,
      },
    };
  },
});
