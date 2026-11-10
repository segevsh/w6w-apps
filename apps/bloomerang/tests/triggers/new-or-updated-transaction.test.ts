import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-transaction.ts";
import { clock } from "../../lib/since.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const NOW = Date.UTC(2026, 10, 9, 10, 0, 0);
const tx = (Id: number, modified: string) => ({ Id, AuditTrail: { LastModifiedDate: modified } });
const page = (...results: unknown[]) => mockCtx([{ body: { Results: results } }]);

test("new-or-updated-transaction: seeds, emits new and edited, retries idempotently, filters by lastModified", async () => {
  clock.now = () => NOW;
  const seed = page(tx(1, "m1"));
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.bloomerang.co/v2/transactions?skip=0&take=50&lastModified=2026-11-09T09%3A58%3A00.000Z",
  );

  const rows = [tx(2, "m2"), tx(1, "m1b"), tx(1, "m1")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  assertEquals(first.events, [tx(1, "m1b"), tx(2, "m2")]);
  assertEquals(retry, first);
});
