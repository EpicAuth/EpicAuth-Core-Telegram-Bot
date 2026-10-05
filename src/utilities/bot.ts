import fs from "fs";
import path from "path";
import { Bot, type Context } from "grammy";
import logger from "./logger";
import config from "../config";
import { conversations } from "./conversation";
import { stateManager } from "./state";
import type { Button } from "../interfaces/Button";
import type { Command } from "../interfaces/Command";

type Loadable = { name?: string; description?: string; cooldown?: number };

export default class TelegramBot extends Bot {
  public buttons = new Map<string, Button>();
  public commands = new Map<string, Command>();
  public cooldowns = new Map<string, Map<number, number>>();

  constructor(token: string) {
    super(token);

    void this.bootstrap();
    this.on("message", (ctx) => this.handleMessage(ctx));
    this.on("callback_query:data", (ctx) => this.handleCallback(ctx));
  }

  private async bootstrap(): Promise<void> {
    await Promise.all([
      config.loading.buttons
        ? this.loadModules(path.join(__dirname, "../buttons"), this.buttons, config.logging.buttonLoad)
        : Promise.resolve(),
      config.loading.commands
        ? this.loadModules(path.join(__dirname, "../commands"), this.commands, config.logging.commandLoad)
        : Promise.resolve(),
    ]);

    if (config.loading.setCommands) {
      try {
        await this.api.setMyCommands(
          [...this.commands.values()]
            .filter((command) => command.description)
            .map((command) => ({ command: command.name, description: command.description! })),
        );
      } catch (error) {
        logger.error(`Unable to publish the command list: ${error}`);
      }
    }

    try {
      const me = await this.api.getMe();
      logger.success(`Bot online as @${me.username} (${me.first_name})`);
      logger.info(`${this.commands.size} commands and ${this.buttons.size} buttons ready`);
    } catch (error) {
      logger.fatal(`Unable to reach the Telegram API: ${error}`);
    }
  }

  private async loadModules<T extends Loadable>(
    directory: string,
    registry: Map<string, T>,
    shouldLog: boolean,
  ): Promise<void> {
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    await Promise.all(
      entries.map(async (entry) => {
        const target = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          return this.loadModules(target, registry, shouldLog);
        }

        if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".js")) return;

        try {
          const module = require(target) as T;

          if (typeof module.name === "string") {
            registry.set(module.name, module);
            if (shouldLog) logger.success(`Loaded "${module.name}"`);
          }
        } catch (error) {
          logger.error(`Failed to load ${target}: ${error}`);
        }
      }),
    );
  }

  private async passesCooldown(
    ctx: Context,
    telegramUserId: number,
    scope: string,
    seconds = 0,
  ): Promise<boolean> {
    if (seconds <= 0) return true;

    const stamps = this.cooldowns.get(scope) ?? new Map<number, number>();
    this.cooldowns.set(scope, stamps);

    const now = Date.now();
    const previous = stamps.get(telegramUserId);

    if (previous !== undefined) {
      const remaining = (previous + seconds * 1000 - now) / 1000;

      if (remaining > 0) {
        await ctx.reply(`Please wait ${remaining.toFixed(1)}s before using this again.`);
        return false;
      }
    }

    stamps.set(telegramUserId, now);
    setTimeout(() => stamps.delete(telegramUserId), seconds * 1000);

    return true;
  }

  private async handleMessage(ctx: Context): Promise<void> {
    const telegramUserId = ctx.from?.id;
    const text = ctx.message?.text;

    if (telegramUserId && text?.startsWith("/")) {
      const [raw, ...args] = text.split(" ");
      const key = raw!.slice(1).toLowerCase().split("@")[0]!;
      const command = this.commands.get(key);

      if (!command) return;

      if (config.logging.commandUse) {
        logger.info(`User ${telegramUserId} ran /${command.name}`);
      }

      if (conversations.active(telegramUserId)) {
        conversations.cancel(telegramUserId);
      }

      if (!(await this.passesCooldown(ctx, telegramUserId, `command:${command.name}`, command.cooldown))) {
        return;
      }

      try {
        await command.execute(ctx, this, args);
      } catch (error) {
        logger.error(`Command /${command.name} failed: ${error}`);
        await ctx.reply("Something went wrong while handling that command.");
      }

      return;
    }

    if (telegramUserId) {
      if (await conversations.resume(ctx)) return;

      const handler = stateManager.getHandler(telegramUserId);

      if (handler) {
        await handler(ctx);

        if (stateManager.getHandler(telegramUserId) === handler) {
          stateManager.clearState(telegramUserId);
        }
      }
    }
  }

  private async handleCallback(ctx: Context): Promise<void> {
    const payload = ctx.callbackQuery?.data;
    const telegramUserId = ctx.from?.id;

    if (!payload || !telegramUserId) return;

    const [name, ...args] = payload.split(":");
    const button = this.buttons.get(name ?? "");

    if (!button) {
      if (config.logging.buttonUse) {
        logger.warn(`User ${telegramUserId} tapped an unknown button "${name}"`);
      }
      await ctx.answerCallbackQuery({ text: "This button is no longer available.", show_alert: true });
      return;
    }

    if (config.logging.buttonUse) {
      logger.info(`User ${telegramUserId} tapped "${button.name}"`);
    }

    if (!(await this.passesCooldown(ctx, telegramUserId, `button:${button.name}`, button.cooldown))) {
      await ctx.answerCallbackQuery();
      return;
    }

    try {
      await button.execute(ctx, this, args.length > 0 ? args : undefined);
    } catch (error) {
      logger.error(`Button "${button.name}" failed: ${error}`);
      await ctx.answerCallbackQuery();
      await ctx.reply("Something went wrong while handling that button.");
    }
  }
}