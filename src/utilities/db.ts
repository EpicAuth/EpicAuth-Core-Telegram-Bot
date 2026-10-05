import { PrismaLibSql } from "@prisma/adapter-libsql";
import config from "../config";
import { PrismaClient } from "../generated/prisma/client";

const createClient = () =>
  new PrismaClient({
    adapter: new PrismaLibSql({ url: config.database.url }),
  });

const cache = globalThis as typeof globalThis & { prisma?: PrismaClient };

export const prisma = cache.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  cache.prisma = prisma;
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}