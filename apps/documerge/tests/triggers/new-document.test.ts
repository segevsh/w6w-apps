import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-document.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: number) => ({
  id,
  name: `Doc ${id}`,
  type: "html",
  output: "pdf",
  status: "Active",
});
const page = (items: unknown[]) => ({ body: { data: items } });

test("new-document: seeds, emits only new documents, retries idempotently, lists /api/documents", async () => {
  const seed = mockCtx([page([item(1)])]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://app.documerge.ai/api/documents");

  const items = [item(1), item(2)];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page(items)]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page(items)]).ctx,
  );
  assertEquals(first.events, [item(2)]);
  assertEquals(retry, first);
});
