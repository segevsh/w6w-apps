import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-submission.ts";
import { envelope, mockCtx } from "../_helpers.ts";

const response = (items: unknown[]) => ({ body: envelope(items) });

test("new-submission: seeds, emits unseen submissions, retries idempotently, and requests descending creation order", async () => {
  const params = { formId: "form_1" };
  const seed = await trigger.poll!(
    { params, state: {}, subscriptionId: "sub" },
    mockCtx([response([{ id: "old" }])]).ctx,
  );
  assertEquals(seed.events, []);
  assertEquals(seed.nextState?.seeded, true);
  const items = [{ id: "new", created_at: "2026-11-09 12:00:00" }, { id: "old" }];
  const freshMock = mockCtx([response(items)]);
  const fresh = await trigger.poll!(
    { params, state: seed.nextState!, subscriptionId: "sub" },
    freshMock.ctx,
  );
  assertEquals(fresh.events, [items[0]]);
  const retryA = await trigger.poll!(
    { params, state: seed.nextState!, subscriptionId: "sub" },
    mockCtx([response(items)]).ctx,
  );
  const retryB = await trigger.poll!(
    { params, state: seed.nextState!, subscriptionId: "sub" },
    mockCtx([response(items)]).ctx,
  );
  assertEquals(retryA, retryB);
  const request = new URL(freshMock.calls[0].url);
  assertEquals([freshMock.calls[0].method, request.pathname, request.search], [
    "GET",
    "/form/form_1/submissions",
    "?offset=0&limit=100&orderby=created_at&direction=DESC",
  ]);
});
