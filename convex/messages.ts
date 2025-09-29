// convex/messages.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values"

export const getForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("messages")
      .withIndex("by_author_createdAt", (q) =>
        q.eq("author", identity.tokenIdentifier)
      )
      .order("desc") 
      .take(50);
  },
});

export const add = mutation({
  args: { body: v.string() },
  handler: async (ctx, { body }) => {
    const id = await ctx.auth.getUserIdentity();
    if (!id) throw new Error("Not authenticated");
    return await ctx.db.insert("messages", {
      author: id.tokenIdentifier,
      body,
      createdAt: Date.now(),
    });
  },
});
