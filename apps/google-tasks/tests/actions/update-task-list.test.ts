import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-task-list.ts";

Deno.test("update-task-list: PATCHes the title", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "L1", title: "Renamed" } }]);
  await action.execute!({ taskList: "L1", title: "Renamed" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/tasks/v1/users/@me/lists/L1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { title: "Renamed" });
});

Deno.test("update-task-list: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
