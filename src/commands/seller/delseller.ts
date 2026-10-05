import { InlineKeyboard } from "grammy";
import { type Execute } from "../../interfaces/Command";
import { activeApplicationStore, applicationStore } from "../../utilities/store";

export const name: string = "delseller";
export const description: string = "Delete an application";
export const cooldown: number = 5;

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
    await ctx.reply("You have no applications yet.");
    return;
  }

  const keyboard = new InlineKeyboard();

  for (const application of applications) {
    const marker = application.sellerKey === active?.sellerKey ? " ✅" : "";
    keyboard.text(`${application.name}${marker}`, `delseller:${application.sellerKey}`);
  }

  await ctx.reply("Which application do you want to delete?", { reply_markup: keyboard });
};