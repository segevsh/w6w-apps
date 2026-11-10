import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import trigger from "../../triggers/new-or-updated-contact.ts";
import { contactSuite } from "./_suite.ts";

contactSuite("new-or-updated-contact", trigger, "updated_at", (c) => `${c.id}:${c.updated_at}`);

test("new-or-updated-contact: an edit to an already-seen contact is a new event", async () => {
  const T0 = 1_794_182_400_000;
  clock.now = () => T0;
  const row = (updated: string) => ({ id: "c1", email: "c1@example.test", updated_at: updated });
  const res = (r: unknown) => ({ body: { result: [r], _metadata: {} } });
  const seed = mockCtx([res(row("2026-11-09T00:00:30Z"))]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  clock.now = () => T0 + 300_000;
  const same = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([res(row("2026-11-09T00:00:30Z"))]).ctx,
  );
  // Same updated_at as the seed read: already seen, not repeated (it is also inside the floor).
  assertEquals(same.events, []);
  const edited = row("2026-11-09T00:04:00Z");
  const next = await trigger.poll!(
    { params: {}, state: same.nextState, subscriptionId: "s" },
    mockCtx([res(edited)]).ctx,
  );
  assertEquals(next.events, [edited]);
});
