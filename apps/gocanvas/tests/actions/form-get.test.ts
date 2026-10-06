import { assertEquals } from "@std/assert";
import action from "../../actions/form-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-get: GET /api/v3/forms/346127 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 346127 } }]);
  const out = await action.execute({ "formId": 346127, "format": "minimal" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/forms/346127");
  assertEquals(queryOf(calls[0].url), { "format": "minimal" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 346127 });
});
