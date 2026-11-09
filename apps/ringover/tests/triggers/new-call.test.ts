import assert from "node:assert/strict";
import { test } from "node:test";
import trigger from "../../triggers/new-call.ts";
import { mockCtx } from "../_helpers.ts";
const request = { method: "GET", path: "/v2/calls", query: { limit_count: "100" } };
const response = (cdr: number) => ({ body: { call_list: [{ cdr_id: cdr, direction: "in" }] } });
test("new-call seeds, emits once, retries idempotently, and reads the call log", async () => {
  const seeded = await trigger.poll!({ params: {}, state: {} }, mockCtx([response(1)]).ctx);
  assert.deepEqual(seeded.events, []);
  assert.equal(seeded.nextState.seeded, true);
  const run = mockCtx([response(2)]);
  const out = await trigger.poll!({ params: {}, state: seeded.nextState }, run.ctx);
  assert.deepEqual(out.events, [{ cdr_id: 2, direction: "in" }]);
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
