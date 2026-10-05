import { InlineKeyboard, type Context } from "grammy";
import type { Result } from "./api";

const MARKDOWN_V2_SPECIALS = /[_*[\]()~`>#+=|{}.!-]/g;

export function escape(value: unknown): string {
  return String(value ?? "").replace(MARKDOWN_V2_SPECIALS, "\\$&");
}

export function escapeOr(value: unknown, fallback = "Not set"): string {
  const text = String(value ?? "").trim();
  return text.length > 0 ? escape(text) : fallback;
}

export function done(text: string): string {
  return `✅ ${text}`;
}

export function failed(message: unknown): string {
  return `❌ ${String(message ?? "The request could not be completed.")}`;
}

export async function ensure<T>(ctx: Context, result: Result<T>): Promise<T | null> {
  if (result.ok) return result.data;
  await ctx.reply(failed(result.message));
  return null;
}

export function confirmKeyboard(scope: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("Confirm", `${scope}:confirm`)
    .text("Cancel", `${scope}:cancel`);
}

export type Choice = { label: string; payload: string };

export function choiceKeyboard(
  choices: Choice[],
  options: { perRow?: number; footer?: (keyboard: InlineKeyboard) => void } = {},
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const perRow = options.perRow ?? 1;

  choices.forEach((choice, index) => {
    keyboard.text(choice.label, choice.payload);

    const last = index === choices.length - 1;
    if ((index + 1) % perRow === 0 || last) {
      keyboard.row();
    }
  });

  options.footer?.(keyboard);

  return keyboard;
}

export async function presentChoices(
  ctx: Context,
  choices: Choice[],
  options: {
    empty: string;
    question: string;
    perRow?: number;
    footer?: (keyboard: InlineKeyboard) => void;
  },
): Promise<void> {
  if (choices.length === 0) {
    await ctx.editMessageText(options.empty);
    return;
  }

  await ctx.editMessageText(options.question, {
    reply_markup: choiceKeyboard(choices, options),
  });
}