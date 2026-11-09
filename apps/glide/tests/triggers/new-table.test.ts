import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-table.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const table = (id: string) => ({ id, name: `Table ${id}` });

test("new-table: seeds, emits additions, retries idempotently, and lists Big Tables", async () => {
  const seededCtx = mockCtx([{ body: envelope([table("a")]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seededCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seededCtx.calls[0].method, "GET");
  assertEquals(seededCtx.calls[0].url, "https://api.glideapps.com/tables");
  const next = [table("a"), table("b")];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: envelope(next) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: envelope(next) }]).ctx,
  );
  assertEquals(first.events, [{ change: "added", key: "b", values: table("b") }]);
  assertEquals(retry, first);
});
