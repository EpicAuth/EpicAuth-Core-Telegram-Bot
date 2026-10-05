import "dotenv/config";
import { GrammyError, HttpError } from "grammy";
import logger from "./utilities/logger";
import TelegramBot from "./utilities/bot";
import { disconnect } from "./utilities/db";

async function main(): Promise<void> {
  const token = process.env.TELEGRAM_API_KEY;

  if (!token) {
    logger.fatal("TELEGRAM_API_KEY is missing. Copy .env.example to .env and fill it in.");
    return;
  }

  await new TelegramBot(token).start();

  const shutdown = async () => {
    logger.info("Shutting down...");
    await disconnect();
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((error: any) => {
  logger.error(`Update ${error?.ctx?.update?.update_id ?? "?"} failed`);

  if (error?.error instanceof GrammyError) {
    logger.error(`GrammyError: ${error.error.description}`);
  } else if (error?.error instanceof HttpError) {
    logger.error(`HttpError: ${error.error.message}`);
  } else {
    logger.error(`Unexpected error: ${error?.error ?? error}`);
  }
});
