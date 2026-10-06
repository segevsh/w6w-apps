import { assertEquals, assertRejects } from "@std/assert";
import runCancel from "../../actions/run-cancel.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("run-cancel: DELETE answers 204 and the action reports cancelled", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await runCancel.execute({ projectId: "p1", runId: "r1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/projects/p1/runs/r1");
  assertEquals(calls[0].body, null);
  assertEquals(out, { cancelled: true, projectId: "p1", runId: "r1" });
});

Deno.test("run-cancel: a refusal for a finished run is an error, not cancelled:true", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("UNPROCESSABLE_CONTENT", "Run finished"),
  }]);
  await assertRejects(
    () => Promise.resolve(runCancel.execute({ projectId: "p1", runId: "r1" }, ctx)),
    Error,
    "422",
  );
});

Deno.test("run-cancel: the older {reason,details} error shape is formatted", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { reason: "BAD_RUN", details: "no such run", traceId: "t" },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(runCancel.execute({ projectId: "p1", runId: "r1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("BAD_RUN") && err.message.includes("no such run"), true);
});
