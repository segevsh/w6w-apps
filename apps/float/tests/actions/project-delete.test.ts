import { assertEquals } from "@std/assert";
import projectDelete from "../../actions/project-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-delete - DELETEs /projects/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await projectDelete.execute({ project_id: 8 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/projects/8");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true, project_id: 8 });
});
