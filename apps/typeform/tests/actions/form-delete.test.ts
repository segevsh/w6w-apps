import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-delete.ts";

Deno.test("form-delete: DELETEs /forms/{id} and reports deleted", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await action.execute({ formId: "abc" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/forms/abc");
  assertEquals(result, { deleted: true });
});
