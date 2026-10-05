import { type Execute } from "../../interfaces/Button";
import { seller } from "../../utilities/api";
import { conversations, readText } from "../../utilities/conversation";
import { done, ensure } from "../../utilities/reply";
import { applicationStore } from "../../utilities/store";

export const name: string = "create_application";
export const cooldown: number = 10;

export const execute: Execute = async (ctx) => {
  await ctx.answerCallbackQuery();

  if (!ctx.from) {
    await ctx.reply("Unable to identify your Telegram account.");
    return;
  }

  await conversations.start(ctx, {
    sellerKey: "",
    steps: [
      async (step) => {
        await step.reply("Send the seller key of the application.");
      },
      async (step, session) => {
        const key = readText(step);

        if (!key) {
          await step.reply("Send a valid seller key.");
          return;
        }
        console.log("1")
        const details = await ensure(step, await seller.setSeller(key));

        if (!details) {
          session.finish();
          return;
        }
        console.log("2")

        session.set("sellerKey", key);
        console.log("3")

        await step.reply(`Valid key for "${details.name}". What should you call it locally?`);
        console.log("4")

        session.next();
      },
      async (step, session) => {
        const label = readText(step);

        if (!label) {
          await step.reply("Send a valid name.");
          return;
        }

        const telegramUserId = step.from!.id;
        const key = session.get("sellerKey")!;
        const existing = await applicationStore.get(telegramUserId, key);

        if (existing) {
          await step.reply(`This seller key is already saved as "${existing.name}".`);
          session.finish();
          return;
        }

        await applicationStore.save(telegramUserId, key, label);
        await applicationStore.activate(telegramUserId, key);

        await step.reply(done(`"${label}" saved and selected.`));
        session.finish();
      },
    ],
  });
};