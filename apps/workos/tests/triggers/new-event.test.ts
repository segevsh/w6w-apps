import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-event.ts";
const input = { params: { events: "dsync.user.created" }, subscriptionId: "sub-1" };
const item = (id: string) => ({ id });
const ctx = (data: unknown[]) => mockCtx([{ body: { data, list_metadata: {} } }]);
test("new-event seeds, emits, retries, and calls the event feed", async () => {
  const seed = ctx([item("a")]);
  const s = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(s.events, []);
  assertEquals((s.nextState as { seeded: boolean }).seeded, true);
  assertEquals({ method: seed.calls[0].method, url: seed.calls[0].url }, {
    method: "GET",
    url: "https://api.workos.com/events?events=dsync.user.created&limit=100",
  });
  const n = await trigger.poll!({ ...input, state: s.nextState }, ctx([item("b"), item("a")]).ctx);
  assertEquals(n.events, [item("b")]);
  assertEquals(
    await trigger.poll!({ ...input, state: s.nextState }, ctx([item("b"), item("a")]).ctx),
    n,
  );
});
