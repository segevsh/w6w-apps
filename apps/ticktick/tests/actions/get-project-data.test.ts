import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-project-data.ts";

Deno.test("get-project-data: GETs /project/{id}/data", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { project: { id: "P1" }, tasks: [{ id: "T1" }], columns: [] },
  }]);
  const out = await action.execute!({ projectId: "P1" }, ctx) as { tasks: unknown[] };
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/project/P1/data");
  assertEquals(out.tasks, [{ id: "T1" }]);
});

Deno.test("get-project-data: declares the three documented top-level fields", () => {
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), [
    "project",
    "tasks",
    "columns",
  ]);
});

Deno.test("get-project-data: says out loud that its tasks are the undone ones", () => {
  assertEquals(action.description!.toLowerCase().includes("completed"), true);
});
