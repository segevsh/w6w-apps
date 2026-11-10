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
// `checkout.date` decides the seed floor: customer 1 checked out before the first check.
const customer = (id: number, date = "2026-11-10T12:02:00Z") => ({ id, checkout: { date } });
const poll = (state: unknown, records: unknown[]) => {
  const mock = mockCtx([{ body: { customers: records } }]);
  return { mock, result: trigger.poll!({ params: {}, state, subscriptionId: "sub-1" }, mock.ctx) };
};

test("new-customer: seeds, emits only new customers, retries idempotently, and uses checkout_from", async () => {
  const t0 = Date.parse("2026-11-10T12:00:00Z");
  at(t0);
  const seeded = await poll({}, []).result;
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  at(t0 + 300_000);
  const old = customer(1, "2026-11-10T11:00:00Z");
  const first = poll(seeded.nextState, [customer(2), old]);
  const retry = poll(seeded.nextState, [customer(2), old]);
  assertEquals((await first.result).events, [customer(2)]);
  const url = new URL(first.mock.calls[0].url);
  assertEquals(first.mock.calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://api.moonclerk.com/customers");
  assertEquals(Object.fromEntries(url.searchParams), {
    checkout_from: "2026-11-08",
    count: "100",
    offset: "0",
  });

  assertEquals(await retry.result, await first.result);
});
