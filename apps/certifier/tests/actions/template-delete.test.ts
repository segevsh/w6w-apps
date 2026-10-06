import { assertEquals } from "@std/assert";
import action from "../../actions/template-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-delete: DELETE /v1/groups/{id}; 204 becomes { deleted, id }", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ groupId: "g1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/groups/g1");
  assertEquals(out, { deleted: true, id: "g1" });
});
