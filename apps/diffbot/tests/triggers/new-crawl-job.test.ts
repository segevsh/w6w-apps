import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { CRAWL_JOB } from "../_fixtures.ts";
import trigger from "../../triggers/new-crawl-job.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const job = (name: string) => ({ ...CRAWL_JOB, name });
const names = (events: unknown[]) => events.map((e) => (e as { name: string }).name);

test("new-crawl-job: seeds, emits only new jobs, retries idempotently, lists /v3/crawl", async () => {
  const seed = mockCtx([{ body: { jobs: [job("a")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  const url = new URL(seed.calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.diffbot.com/v3/crawl");
  assertEquals(url.searchParams.has("name"), false);

  const body = { jobs: [job("a"), job("b")] };
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body }]).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body }]).ctx);
  assertEquals(names(first.events), ["b"]);
  assertEquals(retry, first);
});
