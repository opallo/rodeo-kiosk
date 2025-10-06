// convex/tickets.ts
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

function randomTicketId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const createForPurchase = internalMutation({
  args: {
    userId: v.string(),
    eventId: v.string(),
    quantity: v.number(),
    stripeSessionId: v.string(),
    purchaseId: v.id("purchases"),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0 || !Number.isInteger(args.quantity)) {
      throw new Error("quantity must be a positive integer");
    }

    const issuedAt = Date.now();
    const mintedTicketIds: string[] = [];

    for (let i = 0; i < args.quantity; i += 1) {
      const ticketId = randomTicketId();
      await ctx.db.insert("tickets", {
        ticketId,
        eventId: args.eventId,
        ownerTokenIdentifier: args.userId,
        stripeSessionId: args.stripeSessionId,
        status: "active",
        issuedAt,
      });
      mintedTicketIds.push(ticketId);
    }

    if (mintedTicketIds.length > 0) {
      const purchase = await ctx.db.get(args.purchaseId);
      if (purchase && !purchase.ticketId) {
        await ctx.db.patch(args.purchaseId, { ticketId: mintedTicketIds[0] });
      }
    }

    return {
      count: mintedTicketIds.length,
      ticketIds: mintedTicketIds,
    };
  },
});
