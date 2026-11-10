import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-crawl.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const crawl = (id: string) => ({ id });
// The state carries a cursor and floor stamped from the clock: pin it so a retry is byte-equal.
Date.now = () => Date.parse("2026-11-09T12:00:00Z");

test("new-crawl: seeds, emits only new crawls, retries idempotently, lists the crawls", async () => {
  const seed = mockCtx([{ body: { crawls: [crawl("a")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://production-sfo.browserless.io/crawl?limit=100");

  const response = { crawls: [crawl("b"), crawl("a")] };
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: response }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: response }]).ctx,
  );
  assertEquals(first.events, [crawl("b")]);
  assertEquals(retry, first);
});

test("new-crawl: follows nextCursor and finds a new crawl on a later page", async () => {
  const prior = { v: 1, kind: "ids", seeded: true, ids: ["a", "b"] };
  const ctx = mockCtx([
    { body: { crawls: [crawl("a"), crawl("b")], nextCursor: "cur1" } },
    { body: { crawls: [crawl("c")], nextCursor: null } },
  ]);
  const out = await trigger.poll!({ ...input, state: prior }, ctx.ctx);
  assertEquals(out.events, [crawl("c")]);
  assertEquals(
    ctx.calls[1].url,
    "https://production-sfo.browserless.io/crawl?limit=100&cursor=cur1",
  );
});
