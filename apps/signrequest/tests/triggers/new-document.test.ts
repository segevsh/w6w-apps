import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-document.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (uuid: string) => ({ uuid, name: "Agreement" });
const page = (results: unknown[]) => ({ results });

test("new-document seeds, emits, retries, and requests the literal documents-search page", async () => {
  const seed = mockCtx([{ body: page([item("a")]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://signrequest.com/api/v1/documents-search/?page=1&limit=100",
  );
  const next = page([item("b"), item("a")]);
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: next }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: next }]).ctx,
  );
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
