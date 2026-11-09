import assert from "node:assert/strict";
import { test } from "node:test";
import trigger from "../../triggers/new-entry.ts";
import { mockCtx as baseCtx } from "../_helpers.ts";
const mockCtx = (r: Parameters<typeof baseCtx>[0]) =>
  baseCtx(r, { display: { endpoint: "https://example.com" } });
const request = {
  method: "GET",
  path: "/api/articles",
  query: {
    "sort[0]": "createdAt:desc",
    "pagination[page]": "1",
    "pagination[pageSize]": "100",
  },
};
const response = (documentId: string) => ({
  body: { data: [{ id: 1, documentId, title: "t" }], meta: {} },
});
test("new-entry seeds, emits once, retries idempotently, and requests newest first", async () => {
  const params = { collection: "articles" };
  const seeded = await trigger.poll!({ params, state: {} }, mockCtx([response("old")]).ctx);
  assert.deepEqual(seeded.events, []);
  assert.equal(seeded.nextState.seeded, true);
  const run = mockCtx([response("new")]);
  const out = await trigger.poll!({ params, state: seeded.nextState }, run.ctx);
  assert.deepEqual(out.events, [{ id: 1, documentId: "new", title: "t" }]);
  assert.deepEqual(
    await trigger.poll!({ params, state: seeded.nextState }, mockCtx([response("new")]).ctx),
    out,
  );
  const url = new URL(run.calls[0].url);
  assert.deepEqual({
    method: run.calls[0].method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
  }, request);
});
