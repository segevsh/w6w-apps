import { assertEquals } from "@std/assert";
import tasksPerson from "../../actions/tasks-person-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tasks-person-list: task_status is sent only when chosen", async () => {
  const { ctx, calls } = mockCtx([{ body: { tasks: [] } }, { body: { tasks: [] } }, {
    body: { tasks: [] },
  }]);
  await tasksPerson.execute({ employeeId: "8" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/tasks/people/8");
  assertEquals(queryOf(calls[0].url), {});
  await tasksPerson.execute({ employeeId: "8", taskStatus: "open" }, ctx);
  assertEquals(queryOf(calls[1].url), { task_status: "open" });
  await tasksPerson.execute({ employeeId: "8", taskStatus: "" as unknown as "open" }, ctx);
  assertEquals(queryOf(calls[2].url), {});
});
