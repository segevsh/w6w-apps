import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-object.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (transaction_ref: string) => ({ transaction_ref });
const ctx = (objects: unknown[]) => mockCtx([{ body: { status: "success", objects } }]);

test("new-object seeds, emits, retries, and requests the newest objects page", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://rest.apitemplate.io/v2/list-objects?limit=100&offset=0");
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
