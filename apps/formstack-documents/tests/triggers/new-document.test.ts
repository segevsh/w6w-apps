import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-document.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const document = (id: string) => ({ id, name: `Document ${id}` });

test("new-document: seeds, emits additions, retries idempotently, and lists documents", async () => {
  const seededCtx = mockCtx([{ body: [document("a")] }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seededCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seededCtx.calls[0].method, "GET");
  assertEquals(seededCtx.calls[0].url, "https://www.webmerge.me/api/documents");
  const next = [document("a"), document("b")];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: next }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: next }]).ctx,
  );
  assertEquals(first.events, [{ change: "added", key: "b", values: document("b") }]);
  assertEquals(retry, first);
});
