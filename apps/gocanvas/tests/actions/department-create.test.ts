import { assertEquals } from "@std/assert";
import action from "../../actions/department-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("department-create: POST /api/v3/departments with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 2000 } }]);
  const out = await action.execute({ "name": "Ops", "description": "Field ops" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/departments");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(bodyOf(calls[0]), { "name": "Ops", "description": "Field ops" });
  assertEquals(out, { "id": 2000 });
});
