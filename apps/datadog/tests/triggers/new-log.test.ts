import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-log.ts";

const page = (data: unknown[]) => ({ body: { data } });
test("new-log seeds, emits once, retries idempotently, and requests newest logs", async () => {
  const seeded = await trigger.poll!({ params: {}, state: {} }, mockCtx([page([{ id: "a" }])]).ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const next = page([{ id: "b" }, { id: "a" }]);
  const first = mockCtx([next]);
  const emitted = await trigger.poll!({ params: {}, state: seeded.nextState }, first.ctx);
  assertEquals(emitted.events, [{ id: "b" }]);
  assertEquals({
    method: first.calls[0].method,
    path: new URL(first.calls[0].url).pathname,
    body: JSON.parse(first.calls[0].body!),
  }, {
    method: "POST",
    path: "/api/v2/logs/events/search",
    body: { filter: { query: "*" }, page: { limit: 100 }, sort: "-timestamp" },
  });
  assertEquals(
    await trigger.poll!({ params: {}, state: seeded.nextState }, mockCtx([next]).ctx),
    emitted,
  );
});
