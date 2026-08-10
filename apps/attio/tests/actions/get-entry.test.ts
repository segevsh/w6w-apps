import { assertEquals } from "@std/assert";
import { mockCtx, param, run } from "../_helpers.ts";
import getEntry from "../../actions/get-entry.ts";

const env = { active_from: "2023-04-03T15:21:06.447000000Z", active_until: null };

Deno.test("get-entry: needs both the list and the entry id", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      data: {
        id: { list_id: "l1", entry_id: "e1" },
        parent_object: "people",
        parent_record_id: "r1",
        entry_values: { rating: [{ ...env, attribute_type: "rating", value: 4 }] },
      },
    },
  }]);
  const out = await run<{ values_flat: Record<string, unknown> }>(
    getEntry,
    { list: "sales", entryId: "e1" },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.attio.com/v2/lists/sales/entries/e1");
  assertEquals(out.values_flat, { rating: 4 });
  assertEquals(param(getEntry, "entryId").required, true);
  assertEquals(param(getEntry, "list").required, true);
});
