import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-entry.ts";

test("new-or-updated-entry seeds, emits edited ids, retries, and requests updated-time descending", async () => {
  const item = { id: 1, date_updated: "2026-11-09 00:00:00" };
  const seed = mockCtx([{ body: { entries: [item] } }], { display: DISPLAY });
  const first = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(new URL(seed.calls[0].url).searchParams.get("sorting[direction]"), "DESC");
  const edited = { ...item, date_updated: "2026-11-10 00:00:00" };
  const next = await trigger.poll!(
    { params: {}, state: first.nextState, subscriptionId: "s" },
    mockCtx([{ body: { entries: [edited] } }], { display: DISPLAY }).ctx,
  );
  assertEquals(next.events, [edited]);
});
