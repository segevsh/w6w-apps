import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, page } from "../_helpers.ts";
import trigger from "../../triggers/new-sequence-contact.ts";

const item = (contactId: number) => ({ contactId, statusInSequence: "active" });
const params = { sequenceId: 9 };
const poll = (state: unknown, items: unknown[]) => {
  const m = mockCtx([{ body: page(items) }]);
  return trigger.poll!({ params, state, subscriptionId: "s" }, m.ctx).then((r) => ({
    r,
    calls: m.calls,
  }));
};

test("new-sequence-contact seeds, emits the new contact, retries, and requests the literal addingDate-desc page", async () => {
  const seeded = await poll({}, [item(1)]);
  assertEquals(seeded.r.events, []);
  assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seeded.calls[0].method, "GET");
  assertEquals(
    seeded.calls[0].url,
    "https://api.reply.io/v3/sequences/9/contacts?top=100&sort_by=addingDate&sort_direction=desc",
  );
  const first = await poll(seeded.r.nextState, [item(2), item(1)]);
  const retry = await poll(seeded.r.nextState, [item(2), item(1)]);
  assertEquals(first.r.events, [item(2)]);
  assertEquals(retry.r, first.r);
});
