import { type Execute } from "../../interfaces/Button";
import { conversations, readText } from "../../utilities/conversation";
import { done } from "../../utilities/reply";
import { applicationStore } from "../../utilities/store";

export const name: string = "editseller";
export const cooldown: number = 10;

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

  await conversations.start(ctx, {
    sellerKey,
    steps: [
      async (step) => {
        await step.reply(`What should "${application.name}" be renamed to?`);
      },
      async (step, session) => {
        const label = readText(step);

        if (!label) {
          await step.reply("Send a valid name.");
          return;
        }

        await applicationStore.rename(step.from!.id, sellerKey, label);
        await step.reply(done(`Renamed to "${label}".`));
        session.finish();
      },
    ],
  });
};