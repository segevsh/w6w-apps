import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, page } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";

const item = (id: number) => ({ id });
const poll = (state: unknown, items: unknown[]) => {
  const m = mockCtx([{ body: page(items) }]);
  return trigger.poll!({ params: {}, state, subscriptionId: "s" }, m.ctx).then((r) => ({
    r,
    calls: m.calls,
  }));
};

test("new-contact seeds, emits the new contact, retries, and POSTs the literal addedOn-desc filter", async () => {
  const seeded = await poll({}, [item(1)]);
  assertEquals(seeded.r.events, []);
  assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seeded.calls[0].method, "POST");
  assertEquals(seeded.calls[0].url, "https://api.reply.io/v3/contacts/filter?top=100");
  assertEquals(JSON.parse(seeded.calls[0].body!), { sortBy: "addedOn", sortDirection: "desc" });
  const first = await poll(seeded.r.nextState, [item(2), item(1)]);
  const retry = await poll(seeded.r.nextState, [item(2), item(1)]);
  assertEquals(first.r.events, [item(2)]);
  assertEquals(retry.r, first.r);
});
