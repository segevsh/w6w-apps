import assert from "node:assert/strict";
import { test } from "node:test";
import trigger from "../../triggers/new-contact.ts";
import { mockCtx } from "../_helpers.ts";
const request = {
  method: "POST",
  path: "/pub/v2.3/contacts/list",
  body: { sortBy: "created_at", sortOrder: "desc", page: 1, length: 100 },
};
const response = (id: string) => ({ body: { data: [{ id }] } });
test("new-contact seeds, emits once, retries idempotently, and requests newest first", async () => {
  const seeded = await trigger.poll!({ params: {}, state: {} }, mockCtx([response("old")]).ctx);
  assert.deepEqual(seeded.events, []);
  assert.equal(seeded.nextState.seeded, true);
  const run = mockCtx([response("new")]);
  const out = await trigger.poll!({ params: {}, state: seeded.nextState }, run.ctx);
  assert.deepEqual(out.events, [{ id: "new" }]);
  assert.deepEqual(
    await trigger.poll!({ params: {}, state: seeded.nextState }, mockCtx([response("new")]).ctx),
    out,
  );
  assert.deepEqual({
    method: run.calls[0].method,
    path: new URL(run.calls[0].url).pathname,
    body: JSON.parse(run.calls[0].body!),
  }, request);
});
