import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-design.ts";

test("new-design seeds, emits once, retries idempotently, and requests newest designs", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} },
    mockCtx([{ body: { items: [{ id: "a" }] } }]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const page = { body: { items: [{ id: "b" }, { id: "a" }] } };
  const first = mockCtx([page]);
  const emitted = await trigger.poll!({ params: {}, state: seeded.nextState }, first.ctx);
  assertEquals(emitted.events, [{ id: "b" }]);
  assertEquals({
    method: first.calls[0].method,
    path: new URL(first.calls[0].url).pathname,
    query: Object.fromEntries(new URL(first.calls[0].url).searchParams),
  }, {
    method: "GET",
    path: "/rest/v1/designs",
    query: { sort_by: "modified_descending", limit: "100" },
  });
  assertEquals(
    await trigger.poll!({ params: {}, state: seeded.nextState }, mockCtx([page]).ctx),
    emitted,
  );
});
