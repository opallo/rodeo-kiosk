// convex/ticketsActions.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// The action will always return this shape
type MintResult = {
  minted: boolean;
  ticketId: string;
  _id: Id<"tickets">;
};

export const mintFromCheckoutSessionAction = action({
  args: {
    sessionId: v.string(),
    eventId: v.string(),
    tokenIdentifier: v.string(),
    amountTotal: v.number(),
    currency: v.string(),
    created: v.number(), // seconds epoch from Stripe event
    token: v.string(),   // CONVEX_MINT_TOKEN
  },
  // 👇 key fix: explicitly type the handler's Promise return
  handler: async (ctx, args): Promise<MintResult> => {
    const expected = process.env.CONVEX_MINT_TOKEN;
    if (!expected || args.token !== expected) throw new Error("Unauthorized");

    // 👇 and (optionally) annotate the mutation result too
    const result: MintResult = await ctx.runMutation(
      internal.tickets.mintFromCheckoutSession,
      {
        sessionId: args.sessionId,
        eventId: args.eventId,
        tokenIdentifier: args.tokenIdentifier,
        amountTotal: args.amountTotal,
        currency: args.currency,
        created: args.created,
      }
    );
    return result;
  },
});
