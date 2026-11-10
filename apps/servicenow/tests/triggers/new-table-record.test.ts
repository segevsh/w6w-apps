import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockServiceNowCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newTableRecord from "../../triggers/new-table-record.ts";
import newOrUpdatedTableRecord from "../../triggers/new-or-updated-table-record.ts";

const row = (sys_id: string) => ({ sys_id, sys_updated_on: "2026-11-09 12:00:00" });

test("ServiceNow table triggers seed, emit, retry, and request literal ordered queries", async () => {
  const original = clock.now;
  clock.now = () => Date.parse("2026-11-09T12:02:00.000Z");
  try {
    for (
      const [trigger, stamp] of [[newTableRecord, "sys_created_on"], [
        newOrUpdatedTableRecord,
        "sys_updated_on",
      ]] as const
    ) {
      const seed = mockServiceNowCtx([{ body: { result: [row("a")] } }]);
      const seeded = await trigger.poll!({
        params: { table: "incident" },
        state: {},
        subscriptionId: "sub-1",
      }, seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(
        seed.calls[0].url,
        `https://acme.service-now.com/api/now/table/incident?sysparm_query=${stamp}%3E%3D2026-11-09+12%3A00%3A00%5EORDERBYDESC${stamp}&sysparm_limit=100&sysparm_offset=0`,
      );
      const next = { result: [row("b"), row("a")] };
      const call = {
        params: { table: "incident" },
        state: seeded.nextState,
        subscriptionId: "sub-1",
      };
      const first = await trigger.poll!(call, mockServiceNowCtx([{ body: next }]).ctx);
      const retry = await trigger.poll!(call, mockServiceNowCtx([{ body: next }]).ctx);
      assertEquals(first.events, [row("b")]);
      assertEquals(retry, first);
    }
  } finally {
    clock.now = original;
  }
});
