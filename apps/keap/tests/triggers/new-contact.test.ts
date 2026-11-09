import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-contact.ts";
import { mockCtx } from "../_helpers.ts";

const page = (ids: string[]) => ({
  body: { contacts: ids.map((id) => ({ id, given_name: `n${id}` })) },
});
const params = {};

test("new-contact: first check seeds without emitting", async () => {
  const seed = await trigger.poll!(
    { params, state: {}, subscriptionId: "sub" },
    mockCtx([page(["3", "2", "1"])]).ctx,
  );
  assertEquals(seed.events, []);
  assertEquals(seed.nextState?.seeded, true);
});

test("new-contact: a later check emits only the unseen contact", async () => {
  const seed = await trigger.poll!(
    { params, state: {}, subscriptionId: "sub" },
    mockCtx([page(["2", "1"])]).ctx,
  );
  const next = await trigger.poll!(
    { params, state: seed.nextState!, subscriptionId: "sub" },
    mockCtx([page(["3", "2", "1"])]).ctx,
  );
  assertEquals(next.events, [{ id: "3", given_name: "n3" }]);
});

test("new-contact: the same state and response twice give identical results", async () => {
  const seed = await trigger.poll!(
    { params, state: {}, subscriptionId: "sub" },
    mockCtx([page(["2", "1"])]).ctx,
  );
  const run = () =>
    trigger.poll!(
      { params, state: seed.nextState!, subscriptionId: "sub" },
      mockCtx([page(["4", "3", "2", "1"])]).ctx,
    );
  assertEquals(await run(), await run());
});

test("new-contact: requests the contact-list endpoint newest-first (literal)", async () => {
  const m = mockCtx([page(["1"])]);
  await trigger.poll!({ params, state: {}, subscriptionId: "sub" }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    "https://api.infusionsoft.com/crm/rest/v2/contacts?order_by=create_time%20desc&page_size=50",
  );
});

test("new-contact: wraps a read/search action and declares output, sample and a poll floor", () => {
  assertEquals(trigger.poll !== undefined && trigger.onSubscribe === undefined, true);
  assertEquals(Array.isArray(trigger.output) && trigger.output.length > 0, true);
  assertEquals(trigger.sample !== undefined, true);
  assertEquals((trigger.minIntervalMs ?? 0) >= 60_000, true);
});
