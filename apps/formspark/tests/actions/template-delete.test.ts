import { assertEquals } from "@std/assert";
import templateDelete from "../../actions/template-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-delete: DELETE /forms/{id}/templates/{kind}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await templateDelete.execute({ formId: "f1", kind: "notification" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/public/v1/forms/f1/templates/notification");
  assertEquals(out, { deleted: true, formId: "f1", kind: "notification" });
});
