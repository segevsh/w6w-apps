import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-customer.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const at = (ms: number) => {
  clock.now = () => ms;
};
const customer = (id: number) => ({ id });
const poll = (state: unknown, records: unknown[]) => {
  const mock = mockCtx([{ body: { customers: records } }]);
  return { mock, result: trigger.poll!({ params: {}, state, subscriptionId: "sub-1" }, mock.ctx) };
};

test("new-customer: seeds, emits only new customers, retries idempotently, and uses checkout_from", async () => {
  const t0 = Date.parse("2026-11-10T12:00:00Z");
  at(t0);
  const seed = poll({}, [customer(1)]);
  const seeded = await seed.result;
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const url = new URL(seed.mock.calls[0].url);
  assertEquals(seed.mock.calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://api.moonclerk.com/customers");
  assertEquals(Object.fromEntries(url.searchParams), {
    checkout_from: "2026-11-08",
    count: "100",
    offset: "0",
  });

  at(t0 + 300_000);
  const first = poll(seeded.nextState, [customer(2), customer(1)]);
  const retry = poll(seeded.nextState, [customer(2), customer(1)]);
  assertEquals((await first.result).events, [customer(2)]);
  assertEquals(await retry.result, await first.result);
});
