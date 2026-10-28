import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/department-get-many.ts";

Deno.test("department-get-many: GETs /departments and unwraps `departments`", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { departments: [{ id: 1 }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/departments");
  assertEquals(out, { departments: [{ id: 1 }] });
});
