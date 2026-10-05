import { strict as assert } from "node:assert";
import { prisma, disconnect } from "../src/utilities/db";
import { applicationStore, activeApplicationStore, licenseMaskStore } from "../src/utilities/store";

const USER = 987654321;

async function main() {
  await prisma.application.deleteMany({ where: { telegramUserId: String(USER) } });
  await prisma.activeApplication.deleteMany({ where: { telegramUserId: String(USER) } });
  await prisma.licenseMask.deleteMany({ where: { telegramUserId: String(USER) } });

  assert.equal((await applicationStore.list(USER)).length, 0);
  assert.equal(await activeApplicationStore.get(USER), null);
  assert.equal(await licenseMaskStore.get(USER, "abc"), null);

  await applicationStore.save(USER, "abc", "Alpha");
  await applicationStore.save(USER, "xyz", "Beta");
  await applicationStore.activate(USER, "xyz");

  const list = await applicationStore.list(USER);
  assert.deepEqual(list.map((a) => a.name), ["Alpha", "Beta"]);
  assert.equal((await applicationStore.get(USER, "abc"))?.name, "Alpha");
  assert.equal((await activeApplicationStore.get(USER))?.sellerKey, "xyz");

  await applicationStore.save(USER, "xyz", "Beta Renamed");
  assert.equal((await applicationStore.get(USER, "xyz"))?.name, "Beta Renamed");

  await licenseMaskStore.set(USER, "abc", "****-****");
  await licenseMaskStore.set(USER, "abc", "****-ABCD");
  assert.equal((await licenseMaskStore.get(USER, "abc"))?.mask, "****-ABCD");
  assert.equal(await licenseMaskStore.get(USER, "zzz"), null);

  const removed = await applicationStore.remove(USER, "xyz");
  assert.equal(removed.wasActive, true);
  assert.equal(await activeApplicationStore.get(USER), null);
  assert.deepEqual((await applicationStore.list(USER)).map((a) => a.sellerKey), ["abc"]);

  const second = await applicationStore.remove(USER, "abc");
  assert.equal(second.wasActive, false);
  assert.equal((await applicationStore.list(USER)).length, 0);

  await prisma.application.deleteMany({ where: { telegramUserId: String(USER) } });
  await prisma.licenseMask.deleteMany({ where: { telegramUserId: String(USER) } });

  console.log("Prisma store smoke test passed.");
  await disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await disconnect();
  process.exit(1);
});