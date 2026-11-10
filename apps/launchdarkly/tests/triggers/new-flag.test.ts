import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-flag.ts";

const conn = { display: { projectKey: "default" } };
const input = { params: {}, subscriptionId: "sub-1" };
const flag = (key: string) => ({ key, name: key, kind: "boolean", creationDate: 1762689600000 });
const page = (...keys: string[]) => ({ status: 200, body: { items: keys.map(flag) } });

test("new-flag: seeds, emits the new flag, retries idempotently, requests newest-first", async () => {
  const seed = mockCtx([page("old")], conn);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  const url = new URL(seed.calls[0].url);
  assertEquals(url.pathname, "/api/v2/flags/default");
  assertEquals(url.searchParams.get("sort"), "-creationDate");
  assertEquals(url.searchParams.get("summary"), "true");
  assertEquals(url.searchParams.get("limit"), "100");
  const run = () =>
    trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([page("fresh", "old")], conn).ctx);
  const first = await run();
  assertEquals(first.events, [flag("fresh")]);
  assertEquals(await run(), first);
});
