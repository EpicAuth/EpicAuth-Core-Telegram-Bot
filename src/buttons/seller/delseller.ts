import { type Execute } from "../../interfaces/Button";
import { done, ensure } from "../../utilities/reply";
import { applicationStore } from "../../utilities/store";

export const name: string = "delseller";
export const cooldown: number = 5;

export const execute: Execute = async (ctx, _bot, args) => {
  await ctx.answerCallbackQuery();

  const telegramUserId = ctx.from?.id;
  const sellerKey = args?.[0];

  if (!telegramUserId || !sellerKey) {
    await ctx.reply("That request is missing an application reference.");
    return;
  }

  const application = await applicationStore.get(telegramUserId, sellerKey);

  if (!application) {
    await ctx.reply("That application is no longer saved.");
    return;
  }

  const { wasActive } = await applicationStore.remove(telegramUserId, sellerKey);

  await ctx.reply(
    done(`"${application.name}" was deleted.${wasActive ? " Nothing is selected right now." : ""}`),
  );
};