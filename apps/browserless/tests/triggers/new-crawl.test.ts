import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-crawl.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const crawl = (id: string) => ({ id });

test("new-crawl: seeds, emits only new crawls, retries idempotently, requests newest first", async () => {
  const seed = mockCtx([{ body: { data: [crawl("a")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://production-sfo.browserless.io/crawl?limit=100");

  const response = { data: [crawl("b"), crawl("a")] };
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
