import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-checklist-item.ts";

Deno.test("delete-checklist-item: DELETEs the item and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ taskList: "L1", task: "T1", checklistItem: "c1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/todo/lists/L1/tasks/T1/checklistItems/c1",
  );
  assertEquals(out, { status: 204 });
});
