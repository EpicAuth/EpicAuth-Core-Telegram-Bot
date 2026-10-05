import type { Context } from "grammy";
import config from "../config";

type ResponseHandler = (ctx: Context) => Promise<void>;

type Entry = { handler: ResponseHandler | null; timer: ReturnType<typeof setTimeout> };

class StateManager {
  private entries = new Map<number, Entry>();

  setWaitingForResponse(
    userId: number,
    _conversationType: string,
    handler: ResponseHandler | null = null,
  ): void {
    this.clear(userId);

    const timer = setTimeout(() => this.entries.delete(userId), config.conversation.timeoutMs);
    this.entries.set(userId, { handler, timer });
  }

  isWaitingForResponse(userId: number): boolean {
    return this.entries.has(userId);
  }

  getHandler(userId: number): ResponseHandler | null {
    return this.entries.get(userId)?.handler ?? null;
  }

  clearState(userId: number): void {
    this.clear(userId);
  }

  private clear(userId: number): void {
    const entry = this.entries.get(userId);

    if (entry) {
      clearTimeout(entry.timer);
      this.entries.delete(userId);
    }
  }
}

export const stateManager = new StateManager();