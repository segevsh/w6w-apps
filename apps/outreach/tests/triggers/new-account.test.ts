import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newAccount from "../../triggers/new-account.ts";
import newOrUpdated from "../../triggers/new-or-updated-account.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const row = (id: number, updatedAt = "2026-11-09T10:00:00.000Z") => ({
  id,
  type: "account",
  attributes: { name: `a${id}`, updatedAt },
});
const ctx = (rows: unknown[]) => mockCtx([{ body: { data: rows } }]);

test("new-account: seeds, emits only new accounts, retries idempotently, sorts by -createdAt", async () => {
  const seed = ctx([row(1)]);
  const seeded = await newAccount.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.outreach.io/api/v2/accounts?sort=-createdAt&page%5Bsize%5D=100&count=false",
  );

  const page = [row(2), row(1)];
  const first = await newAccount.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await newAccount.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [row(2)]);
  assertEquals(retry, first);
});

test("new-or-updated-account: an edited account is a new event; sorts by -updatedAt", async () => {
  const seed = ctx([row(1)]);
  const seeded = await newOrUpdated.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.outreach.io/api/v2/accounts?sort=-updatedAt&page%5Bsize%5D=100&count=false",
  );

  const page = [row(1, "2026-11-09T12:00:00.000Z"), row(1)];
  const first = await newOrUpdated.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await newOrUpdated.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [row(1, "2026-11-09T12:00:00.000Z")]);
  assertEquals(retry, first);
});
