import { assertEquals } from "@std/assert";
import allocationDelete from "../../actions/allocation-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("allocation-delete - DELETEs /tasks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await allocationDelete.execute({ task_id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/tasks/1");
  assertEquals(out, { deleted: true, task_id: 1 });
});
