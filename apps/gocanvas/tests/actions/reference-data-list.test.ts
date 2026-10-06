import { assertEquals } from "@std/assert";
import action from "../../actions/reference-data-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("reference-data-list: GET /api/v3/reference_data with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 10760 }] }]);
  const out = await action.execute({ "departmentId": 21474, "assigned": true } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/reference_data");
  assertEquals(queryOf(calls[0].url), { "department_id": "21474", "assigned": "true" });
  assertEquals(calls[0].body, null);
  assertEquals((out as { items: unknown }).items, [{ "id": 10760 }]);
});
