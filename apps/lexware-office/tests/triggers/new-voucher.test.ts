import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-voucher.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string, stamp = "1") => ({ id, updatedDate: stamp });
const response = (items: unknown[]) => ({ content: items });
const request = (c: { method: string; url: string }) => ({ method: c.method, url: c.url });

const run = async (state: unknown, items: unknown[]) => {
  const mock = mockCtx([{ body: response(items) }]);
  const result = await trigger.poll!({ ...input, state }, mock.ctx);
  return { result, calls: mock.calls };
};

test("new-voucher: the first check seeds the feed without emitting", async () => {
  const { result } = await run({}, [item("a")]);
  assertEquals(result.events, []);
  assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
});

test("new-voucher: a record added after seeding is emitted once, and a retry repeats it identically", async () => {
  const seeded = (await run({}, [item("a")])).result.nextState;
  const first = await run(seeded, [item("b"), item("a")]);
  const retry = await run(seeded, [item("b"), item("a")]);
  assertEquals(first.result.events, [item("b")]);
  assertEquals(retry.result, first.result);
});

test("new-voucher: requests exactly the endpoint and by `createdDate` descending (`sort=createdDate,DESC`) that `voucher-list` calls", async () => {
  const { calls } = await run({}, [item("a")]);
  assertEquals(calls.length, 1);
  assertEquals(request(calls[0]), {
    method: "GET",
    url:
      "https://api.lexware.io/v1/voucherlist?voucherType=any&voucherStatus=any&sort=createdDate%2CDESC&page=0&size=100",
  });
});
