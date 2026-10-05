import { type Execute } from "../../interfaces/Command";
import { seller } from "../../utilities/api";
import { conversations, readText, readYesNo } from "../../utilities/conversation";
import { done, ensure } from "../../utilities/reply";
import { resolveSellerKey } from "../../utilities/seller";

export const name: string = "delkey";
export const description: string = "Delete a license";

export const execute: Execute = async (ctx) => {
  const sellerKey = await resolveSellerKey(ctx);
  if (!sellerKey) return;

  await conversations.start(ctx, {
    sellerKey,
    steps: [
      async (step) => {
        await step.reply("Which license should I delete?");
      },
      async (step, session) => {
        const license = readText(step);

        if (!license) {
          await step.reply("Send a valid license key.");
          return;
        }

        session.set("license", license);
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
          await seller.deleteLicense(session.sellerKey, license, banUser),
        );

        if (outcome) {
          await step.reply(done(`License \`${license}\` was deleted.`));
        }

        session.finish();
      },
    ],
  });
};