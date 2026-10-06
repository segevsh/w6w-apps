import { assertEquals } from "@std/assert";
import action from "../../actions/reference-data-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("reference-data-get: GET /api/v3/reference_data/10761 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 10761, "rows": [] } }]);
  const out = await action.execute(
    { "referenceDataId": 10761, "format": "rows_with_index" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/reference_data/10761");
  assertEquals(queryOf(calls[0].url), { "format": "rows_with_index" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 10761, "rows": [] });
});
