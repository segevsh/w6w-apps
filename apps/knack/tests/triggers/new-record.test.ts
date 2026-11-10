import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-record.ts";

const input = { params: { objectKey: "object_1", sortField: "field_25" }, subscriptionId: "sub-1" };
const item = (id: string) => ({ id });
const response = (items: unknown[]) => ({
  total_pages: 1,
  current_page: 1,
  total_records: items.length,
  records: items,
});
const request = (c: { method: string; url: string }) => ({ method: c.method, url: c.url });

const run = async (state: unknown, items: unknown[]) => {
  const mock = mockCtx([{ body: response(items) }]);
  const result = await trigger.poll!({ ...input, state }, mock.ctx);
  return { result, calls: mock.calls };
};

test("new-record: the first check seeds the feed without emitting", async () => {
  const { result } = await run({}, [item("a")]);
  assertEquals(result.events, []);
  assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
});

test("new-record: a record added after seeding is emitted once, and a retry repeats it identically", async () => {
  const seeded = (await run({}, [item("a")])).result.nextState;
  const first = await run(seeded, [item("b"), item("a")]);
  const retry = await run(seeded, [item("b"), item("a")]);
  assertEquals(first.result.events, [item("b")]);
  assertEquals(retry.result, first.result);
});

test("new-record: requests exactly the endpoint and by the creation-time field you choose, descending (`sort_field`, `sort_order=desc`) that `record-list` calls", async () => {
  const { calls } = await run({}, [item("a")]);
  assertEquals(calls.length, 1);
  assertEquals(request(calls[0]), {
    method: "GET",
    url:
      "https://api.knack.com/v1/objects/object_1/records?page=1&rows_per_page=100&sort_field=field_25&sort_order=desc",
  });
});
