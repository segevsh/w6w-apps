import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/complete-task.ts";

Deno.test("complete-task: POSTs the dedicated /complete endpoint with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await action.execute!({ projectId: "P1", taskId: "T1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/project/P1/task/T1/complete");
  // Completion is an endpoint here, not a status field write — so no body.
  assertEquals(calls[0].body, null);
  assertEquals(out, { status: 200 });
});

Deno.test("complete-task: survives the documented empty (No Content) success body", async () => {
  const { ctx } = mockCtx([{ status: 200 }]);
  assertEquals(await action.execute!({ projectId: "P1", taskId: "T1" }, ctx), { status: 200 });
});

Deno.test("complete-task: states that there is no un-complete counterpart", () => {
  assert(`${action.description}`.toLowerCase().includes("un-complete"));
  assertEquals(action.idempotent, true);
});
