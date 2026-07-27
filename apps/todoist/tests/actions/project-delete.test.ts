import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-delete.ts";

Deno.test("project-delete: DELETEs /projects/{id} and reports success on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await action.execute!({ projectId: "p1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v2/projects/p1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { success: true });
});
