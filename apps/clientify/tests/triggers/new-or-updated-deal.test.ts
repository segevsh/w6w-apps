import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-deal.ts";
import { clock } from "../../lib/since.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const NOW = Date.UTC(2026, 10, 9, 10, 0, 0);
const rec = (id: number, m: string) => ({ id, modified: m });
const page = (...results: unknown[]) => mockCtx([{ body: { results, next: null } }]);

test("new-or-updated-deal: seeds, emits only new, retries idempotently, filters on modified[gte]", async () => {
  clock.now = () => NOW;
  const seed = page(rec(1, "m1"));
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.clientify.net/v1/deals/?modified%5Bgte%5D=2026%2F11%2F09&page=1",
  );

  const rows = [rec(2, "m2"), rec(1, "m1b"), rec(1, "m1")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  assertEquals(first.events, [rec(1, "m1b"), rec(2, "m2")]);
  assertEquals(retry, first);
});
