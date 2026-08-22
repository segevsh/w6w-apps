import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-get.ts";

const display = { projectId: "p1" };

Deno.test("job-get: fetches a job with its optional location", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: { state: "DONE" } } }], {
    display,
  });
  await action.execute!({ jobId: "j1", location: "EU" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/bigquery/v2/projects/p1/jobs/j1");
  assertEquals(new URL(calls[0].url).searchParams.get("location"), "EU");
});

/** DONE does not mean success — the reason lives in status.errorResult. */
Deno.test("job-get: a failed job is still DONE, and the output says where to look", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: { state: "DONE", errorResult: { reason: "invalidQuery" } } },
  }], { display });
  const result = await action.execute!({ jobId: "j1" }, ctx) as {
    status: { state: string; errorResult?: unknown };
  };
  assertEquals(result.status.state, "DONE");
  assertEquals((result.status.errorResult as { reason: string }).reason, "invalidQuery");
  const outputs = action.output as Array<{ key: string; label: string }>;
  const statusOutput = outputs.find((o) => o.key === "status")!;
  assertEquals(statusOutput.label.includes("errorResult"), true);
});

Deno.test("job-get: a blank job id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`jobId`");
  assertEquals(calls.length, 0);
});
