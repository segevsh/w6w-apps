import assert from "node:assert/strict";
import { test } from "node:test";
import trigger from "../../triggers/new-story.ts";
import { mockCtx } from "../_helpers.ts";
const D = { display: { credentialKind: "delivery", region: "eu" } };
const request = {
  method: "GET",
  path: "/v2/cdn/stories",
  query: { sort_by: "first_published_at:desc", page: "1", per_page: "100", version: "published" },
};
const response = (uuid: string) => ({ body: { stories: [{ id: 1, uuid }] } });
test("new-story seeds, emits once, retries idempotently, and requests newest first", async () => {
  const seeded = await trigger.poll!({ params: {}, state: {} }, mockCtx([response("old")], D).ctx);
  assert.deepEqual(seeded.events, []);
  assert.equal(seeded.nextState.seeded, true);
  const run = mockCtx([response("new")], D);
  const out = await trigger.poll!({ params: {}, state: seeded.nextState }, run.ctx);
  assert.deepEqual(out.events, [{ id: 1, uuid: "new" }]);
  assert.deepEqual(
    await trigger.poll!({ params: {}, state: seeded.nextState }, mockCtx([response("new")], D).ctx),
    out,
  );
  const url = new URL(run.calls[0].url);
  assert.deepEqual({
    method: run.calls[0].method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
  }, request);
});
