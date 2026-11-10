import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-invoice.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string, stamp = "1") => ({ id, updatedAt: stamp });
const response = (items: unknown[]) => ({ data: { invoices: { nodes: items } } });
const request = (c: { method: string; url: string; body: string | null }) => ({
  method: c.method,
  url: c.url,
  variables: JSON.parse(c.body ?? "{}").variables,
});

const run = async (state: unknown, items: unknown[]) => {
  const mock = mockCtx([{ body: response(items) }]);
  const result = await trigger.poll!({ ...input, state }, mock.ctx);
  return { result, calls: mock.calls };
};

test("new-invoice: the first check seeds the feed without emitting", async () => {
  const { result } = await run({}, [item("a")]);
  assertEquals(result.events, []);
  assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
});

test("new-invoice: a record added after seeding is emitted once, and a retry repeats it identically", async () => {
  const seeded = (await run({}, [item("a")])).result.nextState;
  const first = await run(seeded, [item("b"), item("a")]);
  const retry = await run(seeded, [item("b"), item("a")]);
  assertEquals(first.result.events, [item("b")]);
  assertEquals(retry.result, first.result);
});

test("new-invoice: requests exactly the endpoint and by `CREATED_AT` descending that `invoice-list` calls", async () => {
  const { calls } = await run({}, [item("a")]);
  assertEquals(calls.length, 1);
  assertEquals(request(calls[0]), {
    method: "POST",
    url: "https://api.getjobber.com/api/graphql",
    variables: { sort: [{ key: "CREATED_AT", direction: "DESCENDING" }], first: 100 },
  });
});
