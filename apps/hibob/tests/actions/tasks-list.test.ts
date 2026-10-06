import { assertEquals } from "@std/assert";
import tasksList from "../../actions/tasks-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tasks-list: GETs /v1/tasks", async () => {
  const { ctx, calls } = mockCtx([{ body: { tasks: [{ id: 1, title: "Sign contract" }] } }]);
  const out = await tasksList.execute({}, ctx) as { tasks: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/tasks");
  assertEquals(out.tasks.length, 1);
});
