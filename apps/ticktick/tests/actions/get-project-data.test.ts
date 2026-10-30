import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-project-data.ts";

test("get-project-data: GETs /project/{id}/data", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { project: { id: "P1" }, tasks: [{ id: "T1" }], columns: [] },
  }]);
  const out = await action.execute!({ projectId: "P1" }, ctx) as { tasks: unknown[] };
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/project/P1/data");
  assertEquals(out.tasks, [{ id: "T1" }]);
});

test("get-project-data: declares the three documented top-level fields", () => {
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), [
    "project",
    "tasks",
    "columns",
  ]);
});

test("get-project-data: says out loud that its tasks are the undone ones", () => {
  assertEquals(action.description!.toLowerCase().includes("completed"), true);
});
