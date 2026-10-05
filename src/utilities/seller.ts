import type { Context } from "grammy";
import { activeApplicationStore } from "./store";

export async function resolveSellerKey(ctx: Context): Promise<string | null> {
  const telegramUserId = ctx.from?.id;

  if (!telegramUserId) {
    await ctx.reply("Unable to identify your Telegram account.");
    return null;
  }

  const active = await activeApplicationStore.get(telegramUserId);

  if (!active) {
    await ctx.reply("No application is selected. Run /setseller to choose one first.");
    return null;
  }

  return active.sellerKey;
}