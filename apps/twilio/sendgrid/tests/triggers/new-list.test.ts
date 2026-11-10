import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-list.ts";

const list = (id: string) => ({ id, name: `List ${id}`, contact_count: 0 });
const res = (ids: string[]) => ({ body: { result: ids.map(list), _metadata: {} } });
const poll = async (state: unknown, ids: string[]) => {
  const m = mockCtx([res(ids)]);
  const r = await trigger.poll!({ params: {}, state, subscriptionId: "s" }, m.ctx);
  return { r, calls: m.calls };
};

test("new-list: seeds, emits only added lists, retries idempotently, literal request", async () => {
  const seeded = await poll({}, ["a"]);
  assertEquals(seeded.r.events, []);
  assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seeded.calls[0].method, "GET");
  assertEquals(seeded.calls[0].url, "https://api.sendgrid.com/v3/marketing/lists");
  const first = await poll(seeded.r.nextState, ["a", "b"]);
  const retry = await poll(seeded.r.nextState, ["a", "b"]);
  assertEquals(first.r.events, [list("b")]);
  assertEquals(retry.r, first.r);
});

test("new-list: a deleted list is not an event", async () => {
  const seeded = await poll({}, ["a", "b"]);
  const next = await poll(seeded.r.nextState, ["a"]);
  assertEquals(next.r.events, []);
});
