import { assertEquals } from "@std/assert";
import { mockSignCtx } from "../_helpers.ts";
import action from "../../actions/template-delete.ts";

Deno.test("template-delete: PUT /templates/{id}/delete with no body", async () => {
  const { ctx, calls } = mockSignCtx([
    { body: { code: 0, status: "success", message: "Template deleted successfully" } },
  ]);

  const out = await action.execute({ templateId: "t1" }, ctx);

  const call = calls[0];
  assertEquals(new URL(call.url).pathname, "/api/v1/templates/t1/delete");
  assertEquals(call.method, "PUT");
  assertEquals(call.body, null);
  assertEquals(out, { code: 0, status: "success", message: "Template deleted successfully" });
});
