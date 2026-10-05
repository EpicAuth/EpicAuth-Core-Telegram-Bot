import { type Execute } from "../interfaces/Command";
import { activeApplicationStore, applicationStore } from "../utilities/store";

export const name: string = "start";
export const description: string = "Show what this bot can do";

export const execute: Execute = async (ctx) => {
  const telegramUserId = ctx.from?.id;

  if (!telegramUserId) {
    await ctx.reply("Unable to identify your Telegram account.");
    return;
  }

  const [applications, active] = await Promise.all([
    applicationStore.list(telegramUserId),
    activeApplicationStore.get(telegramUserId),
  ]);

  if (applications.length === 0) {
    await ctx.reply("Welcome! Run /setseller to add your first application.");
    return;
  }

  await ctx.reply(
    active
      ? `You are managing ${applications.length} application(s), and "${active.sellerKey}" is currently selected.`
      : `You are managing ${applications.length} application(s). Run /setseller to pick one.`,
  );
};