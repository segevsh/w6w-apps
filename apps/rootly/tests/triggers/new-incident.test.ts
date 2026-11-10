import assert from "node:assert/strict";
import { test } from "node:test";
import trigger from "../../triggers/new-incident.ts";
import { mockCtx } from "../_helpers.ts";

const request = {
  method: "GET",
  path: "/v1/incidents",
  query: { sort: "-created_at", "page[number]": "1", "page[size]": "100" },
};
const response = (id: string) => ({ body: { data: [{ id, type: "incidents", attributes: {} }] } });
test("new-incident seeds, emits once, retries idempotently, and requests newest first", async () => {
  const seed = mockCtx([response("old")]);
  const seeded = await trigger.poll!({ params: {}, state: {} }, seed.ctx);
  assert.deepEqual(seeded.events, []);
  assert.equal(seeded.nextState.seeded, true);
  const run = mockCtx([response("new")]);
  const out = await trigger.poll!({ params: {}, state: seeded.nextState }, run.ctx);
  assert.deepEqual(out.events, [{ id: "new", type: "incidents" }]);
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState },
    mockCtx([response("new")]).ctx,
  );
  assert.deepEqual(retry, out);
  const url = new URL(run.calls[0].url);
  assert.deepEqual({
    method: run.calls[0].method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
  }, request);
});
