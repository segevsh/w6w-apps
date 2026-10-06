import { assertEquals } from "@std/assert";
import action from "../../actions/form-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-list: GET /api/v3/forms with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 3 }] }]);
  const out = await action.execute({ "assigned": true } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/forms");
  assertEquals(queryOf(calls[0].url), { "assigned": "true" });
  assertEquals(calls[0].body, null);
  assertEquals((out as { items: unknown }).items, [{ "id": 3 }]);
});
