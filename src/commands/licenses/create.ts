import { type Execute } from "../../interfaces/Command";
import { seller } from "../../utilities/api";
import { conversations, readNumber, readText } from "../../utilities/conversation";
import { done, ensure } from "../../utilities/reply";
import { resolveSellerKey } from "../../utilities/seller";
import { licenseMaskStore } from "../../utilities/store";

export const name: string = "create";
export const description: string = "Generate a license key";

const REUSE_ALIASES = new Set(["default", "use default", "saved", "reuse"]);

export const execute: Execute = async (ctx) => {
  const telegramUserId = ctx.from?.id;
  const sellerKey = await resolveSellerKey(ctx);

  if (!sellerKey || !telegramUserId) return;

  const saved = await licenseMaskStore.get(telegramUserId, sellerKey);

  await conversations.start(ctx, {
    sellerKey,
    steps: [
      async (step) => {
        await step.reply(
          saved
            ? `Your saved layout is \`${saved.mask}\`.\n\nReply "default" to reuse it, or send a new one. Use * for a random character.`
            : "Send the key layout. Use * for a random character.",
        );
      },
      async (step, session) => {
        const input = readText(step);

        if (!input) {
          await step.reply("Send a valid layout.");
          return;
        }

        const reuse = REUSE_ALIASES.has(input.toLowerCase());
        const mask = reuse ? saved?.mask : input;

        if (!mask) {
          await step.reply("There is no saved layout to reuse. Send a layout.");
          return;
        }

        if (!reuse) {
          await licenseMaskStore.set(step.from!.id, session.sellerKey, mask);
        }

        session.set("mask", mask);
        await step.reply("How many days should the license remain valid?");
        session.next();
      },
      async (step, session) => {
        const expiry = readNumber(step);

        if (expiry === null || expiry <= 0) {
          await step.reply("Send a positive number of days.");
          return;
        }

        session.set("expiry", String(expiry));
        await step.reply("Which characters should the key use? 1 = mixed case, 2 = uppercase, 3 = lowercase.");
        session.next();
      },
      async (step, session) => {
        const character = readNumber(step);

        if (character === null || character < 1 || character > 3) {
          await step.reply("Send 1, 2, or 3.");
          return;
        }

        const license = await ensure(
          step,
          await seller.generateLicense(
            session.sellerKey,
            Number(session.get("expiry")),
            session.get("mask")!,
            character,
          ),
        );

        if (license) {
          await step.reply(done(`License created: \`${license.key}\``));
        }

        session.finish();
      },
    ],
  });
};