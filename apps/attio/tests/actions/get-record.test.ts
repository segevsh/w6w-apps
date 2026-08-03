import { assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import getRecord from "../../actions/get-record.ts";

const env = { active_from: "2023-04-03T15:21:06.447000000Z", active_until: null };

Deno.test("get-record: GETs the record and attaches values_flat", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      data: {
        id: { workspace_id: "w", object_id: "o", record_id: "r1" },
        values: { stage: [{ ...env, attribute_type: "status", status: { title: "Lead" } }] },
      },
    },
  }]);
  const out = await run<{ values_flat: Record<string, unknown> }>(
    getRecord,
    { object: "deals", recordId: "r1" },
    ctx,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.attio.com/v2/objects/deals/records/r1");
  assertEquals(out.values_flat, { stage: "Lead" });
});

Deno.test("get-record: a record with no values yields an empty flat map, not a crash", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: { id: { record_id: "r1" } } } }]);
  const out = await run<{ values_flat: Record<string, unknown> }>(
    getRecord,
    { object: "people", recordId: "r1" },
    ctx,
  );
  assertEquals(out.values_flat, {});
});
