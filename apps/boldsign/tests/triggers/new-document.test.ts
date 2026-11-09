import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-document.ts";

test("new-document seeds, emits, retries, and requests the newest activity page", async () => {
  const seed = await trigger.poll!(
    { params: {}, state: {} },
    mockCtx([{ body: { result: [{ documentId: "a" }] } }]).ctx,
  );
  assertEquals(seed.events, []);
  const nextCtx = mockCtx([{ body: { result: [{ documentId: "b" }, { documentId: "a" }] } }]);
  const next = await trigger.poll!({ params: {}, state: seed.nextState }, nextCtx.ctx);
  assertEquals(next.events, [{ documentId: "b" }]);
  const retry = await trigger.poll!(
    { params: {}, state: seed.nextState },
    mockCtx([{ body: { result: [{ documentId: "b" }, { documentId: "a" }] } }]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(
    nextCtx.calls[0].url,
    "https://api.boldsign.com/v1/document/list?Page=1&PageSize=100",
  );
});
