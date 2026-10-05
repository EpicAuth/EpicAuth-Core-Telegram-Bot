import { InlineKeyboard } from "grammy";
import { type Execute } from "../../interfaces/Command";
import { activeApplicationStore, applicationStore } from "../../utilities/store";

export const name: string = "setseller";
export const description: string = "Browse or create an application";
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

  const keyboard = new InlineKeyboard();

  if (applications.length === 0) {
    keyboard.text("Create an application", "create_application");
  } else {
    for (const application of applications) {
      const marker = application.sellerKey === active?.sellerKey ? " ✅" : "";
      keyboard.text(`${application.name}${marker}`, `setseller:${application.sellerKey}`);
    }

    keyboard.row().text("Create an application", "create_application");
  }

  await ctx.reply("Pick an application:", { reply_markup: keyboard });
};