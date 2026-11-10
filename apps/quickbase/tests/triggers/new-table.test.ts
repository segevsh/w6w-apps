import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-table.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);

test("new-table: seeds, emits new rows, retries idempotently, and requests the ordered feed", async () => {
  const seed = ctx([{ id: "a" }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.quickbase.com/v1/tables?appId=bqrtest");

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([{ id: "b" }, { id: "a" }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([{ id: "b" }, { id: "a" }]).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});
