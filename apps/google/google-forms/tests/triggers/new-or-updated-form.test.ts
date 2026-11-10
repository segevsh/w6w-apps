import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-form.ts";

test("new-or-updated-form seeds, emits edited ids, retries, and requests modified-time descending", async () => {
  const item = { id: "a", modifiedTime: "2026-11-09T00:00:00Z" };
  const seed = mockCtx([{ body: { files: [item] } }]);
  const first = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(new URL(seed.calls[0].url).searchParams.get("orderBy"), "modifiedTime desc");
  const edited = { ...item, modifiedTime: "2026-11-10T00:00:00Z" };
  const next = await trigger.poll!(
    { params: {}, state: first.nextState, subscriptionId: "s" },
    mockCtx([{ body: { files: [edited] } }]).ctx,
  );
  assertEquals(next.events, [edited]);
});
