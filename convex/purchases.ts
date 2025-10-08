// convex/purchases.ts
import { query } from "./_generated/server";

export const listSuccessfulForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(20);

    return purchases
      .filter((purchase) => purchase.paymentStatus === "paid")
      .map((purchase) => ({
        id: purchase._id,
        createdAt: purchase.createdAt,
        amountTotal: purchase.amountTotal,
        currency: purchase.currency,
        ticketIds: Array.isArray(purchase.ticketIds)
          ? purchase.ticketIds
          : (purchase as unknown as { ticketId?: string }).ticketId
          ? [((purchase as unknown as { ticketId?: string }).ticketId as string)]
          : [],
        stripeSessionId: purchase.stripeSessionId,
        eventId: purchase.eventId,
      }));
  },
});
