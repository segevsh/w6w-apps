import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-bulk-send.ts";

const item = (id: string) => ({ id });
const input = { params: {}, subscriptionId: "sub-1" };

test("new-bulk-send seeds, emits new rows, retries, and requests the literal first page", async () => {
  const seed = mockCtx([{ body: { bulk_sends: [item("a")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://www.signwell.com/api/v1/bulk_sends?page=1&limit=50");
  const page = { body: { bulk_sends: [item("b"), item("a")] } };
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([page]).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([page]).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
