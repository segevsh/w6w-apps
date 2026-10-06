import { assertEquals } from "@std/assert";
import tasksGet from "../../actions/tasks-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("tasks-get: GET /v1/tasks/:id", async () => {
  const task = { id: "t1", type: "research", status: "failed", error: "boom", output: null };
  const { ctx, calls } = mockCtx([{ body: task }]);
  const out = await tasksGet.execute({ id: "t1" }, ctx);
  assertEquals(out, { ...task, task });
  assertEquals(calls[0].url, "https://api.linkup.so/v1/tasks/t1");
});
