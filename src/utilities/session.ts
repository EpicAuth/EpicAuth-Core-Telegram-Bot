import axios from "axios";
import type { Context } from "grammy";
import config from "../config";
import { resolveSellerKey } from "./seller";

const http = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  headers: { "Content-Type": "application/json" },
  validateStatus: () => true,
});

export async function Request(params: Record<string, any>): Promise<any> {
  try {
    const { data } = await http.get("", { params });
    return data;
  } catch {
    return { success: false, message: "The seller API is unreachable. Please try again shortly." };
  }
}

export function GetSellerKey(ctx: Context, _bot?: unknown): Promise<string | null> {
  return resolveSellerKey(ctx);
}