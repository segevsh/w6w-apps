import { assertEquals } from "@std/assert";
import allocationUpdate from "../../actions/allocation-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("allocation-update - PATCHes /tasks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { task_id: 1, hours: 6 } }]);
  const out = await allocationUpdate.execute({ task_id: 1, hours: 6 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/tasks/1");
  assertEquals(JSON.parse(calls[0].body!), { hours: 6 });
  assertEquals(out, { task_id: 1, hours: 6 });
});
