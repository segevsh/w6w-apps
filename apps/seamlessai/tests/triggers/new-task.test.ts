import assert from "node:assert/strict";
import { test } from "node:test";
import trigger from "../../triggers/new-task.ts";
import { mockCtx } from "../_helpers.ts";
const request = {
  method: "GET",
  path: "/api/client/v2/tasks",
  query: { sortColumn: "createdAt", sortOrder: "desc", limit: "100", offset: "0" },
};
const response = (taskId: string) => ({ body: { success: true, data: [{ taskId }] } });
test("new-task seeds, emits once, retries idempotently, and requests newest first", async () => {
  const seeded = await trigger.poll!({ params: {}, state: {} }, mockCtx([response("old")]).ctx);
  assert.deepEqual(seeded.events, []);
  assert.equal(seeded.nextState.seeded, true);
  const run = mockCtx([response("new")]);
  const out = await trigger.poll!({ params: {}, state: seeded.nextState }, run.ctx);
  assert.deepEqual(out.events, [{ taskId: "new" }]);
  assert.deepEqual(
    await trigger.poll!({ params: {}, state: seeded.nextState }, mockCtx([response("new")]).ctx),
    out,
  );
  const url = new URL(run.calls[0].url);
  assert.deepEqual({
    method: run.calls[0].method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
  }, request);
});
