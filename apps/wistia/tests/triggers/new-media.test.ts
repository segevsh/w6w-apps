import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-media.ts";
const input = { params: {}, subscriptionId: "sub-1" };
const item = (hashed_id: string) => ({ hashed_id });
const ctx = (rows: unknown[]) => mockCtx([{ body: rows }]);
test("new-media seeds, emits, retries, and calls sorted media", async () => {
  const seed = ctx([item("a")]);
  const s = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(s.events, []);
  assertEquals((s.nextState as { seeded: boolean }).seeded, true);
  assertEquals({ method: seed.calls[0].method, url: seed.calls[0].url }, {
    method: "GET",
    url:
      "https://api.wistia.com/modern/medias?per_page=100&page=1&sort_by=created&sort_direction=0",
  });
  const n = await trigger.poll!({ ...input, state: s.nextState }, ctx([item("b"), item("a")]).ctx);
  assertEquals(n.events, [item("b")]);
  assertEquals(
    await trigger.poll!({ ...input, state: s.nextState }, ctx([item("b"), item("a")]).ctx),
    n,
  );
});
