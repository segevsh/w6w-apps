import assert from "node:assert/strict";
import { test } from "node:test";
import trigger from "../../triggers/new-person.ts";
import { mockCtx } from "../_helpers.ts";
const request = {
  method: "GET",
  path: "/v2/people",
  query: { sort_by: "created_at", sort_direction: "DESC", page: "1", per_page: "100" },
};
const response = (id: number) => ({ body: { data: [{ id }] } });
test("new-person seeds, emits once, retries idempotently, and requests newest first", async () => {
  const seeded = await trigger.poll!({ params: {}, state: {} }, mockCtx([response(1)]).ctx);
  assert.deepEqual(seeded.events, []);
  assert.equal(seeded.nextState.seeded, true);
  const run = mockCtx([response(2)]);
  const out = await trigger.poll!({ params: {}, state: seeded.nextState }, run.ctx);
  assert.deepEqual(out.events, [{ id: 2 }]);
  assert.deepEqual(
    await trigger.poll!({ params: {}, state: seeded.nextState }, mockCtx([response(2)]).ctx),
    out,
  );
  const url = new URL(run.calls[0].url);
  assert.deepEqual({
    method: run.calls[0].method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
  }, request);
});
