import { type Execute } from "../../interfaces/Command";
import { seller } from "../../utilities/api";
import { conversations, readText, readYesNo } from "../../utilities/conversation";
import { done, ensure } from "../../utilities/reply";
import { resolveSellerKey } from "../../utilities/seller";

export const name: string = "bankey";
export const description: string = "Ban a license";

export const execute: Execute = async (ctx) => {
  const sellerKey = await resolveSellerKey(ctx);
  if (!sellerKey) return;

  await conversations.start(ctx, {
    sellerKey,
    steps: [
      async (step) => {
        await step.reply("Which license should I ban?");
      },
      async (step, session) => {
        const license = readText(step);

        if (!license) {
          await step.reply("Send a valid license key.");
          return;
        }

        session.set("license", license);
        await step.reply("Why are you banning it?");
        session.next();
      },
      async (step, session) => {
        const reason = readText(step);

        if (!reason) {
          await step.reply("Send a reason.");
          return;
        }

        session.set("reason", reason);
        await step.reply("Should the owner be banned too? (yes/no)");
        session.next();
      },
      async (step, session) => {
        const banUser = readYesNo(step);

        if (banUser === null) {
          await step.reply('Reply with "yes" or "no".');
          return;
        }

        const license = session.get("license")!;
        const outcome = await ensure(
          step,
          await seller.banLicense(
            session.sellerKey,
            license,
            session.get("reason")!,
            banUser,
          ),
        );

        if (outcome) {
          await step.reply(done(`License \`${license}\` was banned.`));
        }

        session.finish();
      },
    ],
  });
};