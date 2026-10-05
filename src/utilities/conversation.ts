import type { Context } from "grammy";
import config from "../config";

export interface Session {
  readonly sellerKey: string;
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  next(): void;
  finish(): void;
}

export type Step = (ctx: Context, session: Session) => Promise<void>;

interface Flow {
  telegramUserId: number;
  sellerKey: string;
  steps: Step[];
  index: number;
  answers: Record<string, string>;
  timer: ReturnType<typeof setTimeout>;
}

class Conversations {
  private flows = new Map<number, Flow>();

  async start(
    ctx: Context,
    options: { sellerKey: string; steps: Step[] },
  ): Promise<boolean> {
    const telegramUserId = ctx.from?.id;

    if (!telegramUserId) {
      await ctx.reply("Unable to identify your Telegram account.");
      return false;
    }

    if (options.steps.length === 0) {
      return false;
    }

    this.cancel(telegramUserId);

    const flow: Flow = {
      telegramUserId,
      sellerKey: options.sellerKey,
      steps: options.steps,
      index: 1,
      answers: {},
      timer: setTimeout(() => this.flows.delete(telegramUserId), config.conversation.timeoutMs),
    };

    this.flows.set(telegramUserId, flow);
    await options.steps[0]!(ctx, this.sessionFor(flow));

    return true;
  }

  active(telegramUserId: number): boolean {
    return this.flows.has(telegramUserId);
  }

  cancel(telegramUserId: number): void {
    const flow = this.flows.get(telegramUserId);

    if (flow) {
      clearTimeout(flow.timer);
      this.flows.delete(telegramUserId);
    }
  }

  async resume(ctx: Context): Promise<boolean> {
    const telegramUserId = ctx.from?.id;
    const flow = telegramUserId ? this.flows.get(telegramUserId) : undefined;

    if (!telegramUserId || !flow) {
      return false;
    }

    clearTimeout(flow.timer);
    flow.timer = setTimeout(() => this.flows.delete(telegramUserId), config.conversation.timeoutMs);

    const step = flow.steps[flow.index];

    if (!step) {
      this.cancel(telegramUserId);
      return true;
    }

    await step(ctx, this.sessionFor(flow));

    if (flow.index >= flow.steps.length) {
      this.cancel(telegramUserId);
    }

    return true;
  }

  private sessionFor(flow: Flow): Session {
    return {
      sellerKey: flow.sellerKey,
      get: (key) => flow.answers[key],
      set: (key, value) => {
        flow.answers[key] = value;
      },
      next: () => {
        flow.index += 1;
      },
      finish: () => {
        this.cancel(flow.telegramUserId);
      },
    };
  }
}

export const conversations = new Conversations();

export function readText(ctx: Context): string | null {
  const text = ctx.message?.text?.trim();
  return text ? text : null;
}

export function readNumber(ctx: Context): number | null {
  const text = readText(ctx);
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export function readYesNo(ctx: Context): boolean | null {
  const text = readText(ctx)?.toLowerCase();
  if (text === "yes") return true;
  if (text === "no") return false;
  return null;
}