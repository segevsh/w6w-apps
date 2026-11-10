import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import trigger from "../../triggers/new-conversion-rule.ts";

const input = { params: { accountId: "519072844" }, subscriptionId: "sub-1" };
const rule = (id: number) => ({ id, name: `Rule ${id}`, type: "LEAD" });
const page = (...ids: number[]) => ({
  body: { elements: ids.map(rule), paging: { start: 0, count: 100, total: ids.length } },
});

test("new-conversion-rule: seeds, emits additions, retries idempotently, and finds by account", async () => {
  const seed = mockCtx([page(1)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(pathOf(seed.calls[0].url), "/rest/conversions");
  assertEquals(queryOf(seed.calls[0].url), {
    q: "account",
    account: "urn:li:sponsoredAccount:519072844",
    start: "0",
    count: "100",
  });
  const run = () => trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([page(1, 2)]).ctx);
  const first = await run();
  assertEquals(first.events, [{ change: "added", key: "2", values: rule(2) }]);
  assertEquals(await run(), first);
});
