import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-table.ts";

const input = { params: { appId: "bqrtest" }, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);

test("new-table: seeds, emits only added rows, retries idempotently, and requests the literal list", async () => {
  const seed = ctx([{ id: "bq1", name: "Leads" }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.quickbase.com/v1/tables?appId=bqrtest",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([{ id: "bq2", name: "Deals" }, { id: "bq1", name: "Leads" }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([{ id: "bq2", name: "Deals" }, { id: "bq1", name: "Leads" }]).ctx,
  );
  assertEquals(first.events, [{ id: "bq2", name: "Deals" }]);
  assertEquals(retry, first);

  // an edited row (same key, new values) is not a "new" record
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([{ id: "bq1", name: "Leads (renamed)" }]).ctx,
  );
  assertEquals(edited.events, []);
});
