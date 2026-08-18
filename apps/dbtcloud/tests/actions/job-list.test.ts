import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-list.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };
const page = (data: unknown[], total = data.length) => ({
  status: 200,
  body: { data, extra: { pagination: { count: data.length, total_count: total } } },
});

/** One call that answers which jobs are currently broken. */
Deno.test("job-list: asks for the most recent run by default and counts the failures", async () => {
  const { ctx, calls } = mockCtx([page([
    { id: 1, most_recent_run: { status: 20 } },
    { id: 2, most_recent_run: { status: 10 } },
  ])], { display });
  const result = await action.execute!({}, ctx) as {
    failingCount: number;
    jobs: Array<{ lastRunStatusName?: string }>;
  };
  assertEquals(new URL(calls[0].url).searchParams.get("include_related"), "most_recent_run");
  assertEquals(result.failingCount, 1);
  assertEquals(result.jobs[0].lastRunStatusName, "Error");
  assertEquals(result.jobs[1].lastRunStatusName, "Success");
});

Deno.test("job-list: a job with no run carries no invented status name", async () => {
  const { ctx } = mockCtx([page([{ id: 1 }])], { display });
  const result = await action.execute!({ withLastRun: false }, ctx) as {
    jobs: Array<{ lastRunStatusName?: string }>;
  };
  assertEquals(result.jobs[0].lastRunStatusName, undefined);
});

/** This is why a CI job visible in the UI is missing from the API. */
Deno.test("job-list: hides dbt's own CI jobs unless asked", async () => {
  const hidden = mockCtx([page([])], { display });
  await action.execute!({}, hidden.ctx);
  assertEquals(new URL(hidden.calls[0].url).searchParams.get("is_system"), "false");

  const shown = mockCtx([page([])], { display });
  await action.execute!({ includeSystemJobs: true }, shown.ctx);
  assertEquals(new URL(shown.calls[0].url).searchParams.get("is_system"), null);
});

Deno.test("job-list: the project, environment and name filters reach the wire", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ projectId: "3", environmentId: "5", nameContains: "hourly" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("project_id"), "3");
  assertEquals(q.get("environment_id"), "5");
  assertEquals(q.get("name__icontains"), "hourly");
});

Deno.test("job-list: the CI toggle explains the missing-job symptom", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "includeSystemJobs")!;
  assert(/missing from the API/.test(p.hint!), p.hint);
});
