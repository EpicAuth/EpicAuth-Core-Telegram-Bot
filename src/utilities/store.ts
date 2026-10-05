import { prisma } from "./db";

const owner = (telegramUserId: number) => String(telegramUserId);

export const applicationStore = {
  list(telegramUserId: number) {
    return prisma.application.findMany({
      where: { telegramUserId: owner(telegramUserId) },
      orderBy: { createdAt: "asc" },
    });
  },

  get(telegramUserId: number, sellerKey: string) {
    return prisma.application.findUnique({
      where: { telegramUserId_sellerKey: { telegramUserId: owner(telegramUserId), sellerKey } },
    });
  },

  save(telegramUserId: number, sellerKey: string, name: string) {
    const id = owner(telegramUserId);
    return prisma.application.upsert({
      where: { telegramUserId_sellerKey: { telegramUserId: id, sellerKey } },
      create: { telegramUserId: id, sellerKey, name },
      update: { name },
    });
  },

  activate(telegramUserId: number, sellerKey: string) {
    const id = owner(telegramUserId);
    return prisma.activeApplication.upsert({
      where: { telegramUserId: id },
      create: { telegramUserId: id, sellerKey },
      update: { sellerKey },
    });
  },

  rename(telegramUserId: number, sellerKey: string, name: string) {
    return prisma.application.update({
      where: { telegramUserId_sellerKey: { telegramUserId: owner(telegramUserId), sellerKey } },
      data: { name },
    });
  },

  async remove(telegramUserId: number, sellerKey: string): Promise<{ wasActive: boolean }> {
    const id = owner(telegramUserId);

    return prisma.$transaction(async (tx) => {
      const active = await tx.activeApplication.findUnique({ where: { telegramUserId: id } });
      const wasActive = active?.sellerKey === sellerKey;

      await tx.application.delete({
        where: { telegramUserId_sellerKey: { telegramUserId: id, sellerKey } },
      });

      if (wasActive) {
        await tx.activeApplication.deleteMany({ where: { telegramUserId: id } });
      }

      return { wasActive };
    });
  },
};

export const activeApplicationStore = {
  get(telegramUserId: number) {
    return prisma.activeApplication.findUnique({ where: { telegramUserId: owner(telegramUserId) } });
  },
  clear(telegramUserId: number) {
    return prisma.activeApplication.deleteMany({ where: { telegramUserId: owner(telegramUserId) } });
  },
};

export const licenseMaskStore = {
  get(telegramUserId: number, sellerKey: string) {
    return prisma.licenseMask.findUnique({
      where: { telegramUserId_sellerKey: { telegramUserId: owner(telegramUserId), sellerKey } },
    });
  },
  set(telegramUserId: number, sellerKey: string, mask: string) {
    const id = owner(telegramUserId);
    return prisma.licenseMask.upsert({
      where: { telegramUserId_sellerKey: { telegramUserId: id, sellerKey } },
      create: { telegramUserId: id, sellerKey, mask },
      update: { mask },
    });
  },
};