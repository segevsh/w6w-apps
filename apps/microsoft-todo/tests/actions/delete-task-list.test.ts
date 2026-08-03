import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-task-list.ts";

Deno.test("delete-task-list: DELETEs with no body and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ taskList: "L=1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/todo/lists/L%3D1");
  assertEquals(calls[0].body, null);
  assertEquals(out, { status: 204 });
});
