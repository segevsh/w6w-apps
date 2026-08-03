import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/move-task.ts";

Deno.test("move-task: POSTs a ONE-ELEMENT array — the endpoint is a batch", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ id: "T1", etag: "43p2zso1" }],
  }]);
  const out = await action.execute!(
    { taskId: "T1", fromProjectId: "P1", toProjectId: "P2" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/task/move");
  assertEquals(JSON.parse(calls[0].body!), [
    { fromProjectId: "P1", toProjectId: "P2", taskId: "T1" },
  ]);
  assertEquals(out, { items: [{ id: "T1", etag: "43p2zso1" }], count: 1 });
});

Deno.test("move-task: a non-array response degrades to an empty result, not a wrong shape", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "T1" } }]);
  assertEquals(
    await action.execute!({ taskId: "T1", fromProjectId: "P1", toProjectId: "P2" }, ctx),
    { items: [], count: 0 },
  );
});

Deno.test("move-task: all three ids are required — the source project is not optional", () => {
  for (const key of ["taskId", "fromProjectId", "toProjectId"]) {
    assert(action.params!.find((p) => p.key === key)?.required, `${key} must be required`);
  }
  assertEquals(action.idempotent, true);
});
