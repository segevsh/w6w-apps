import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-get.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };

Deno.test("job-get: fetches one job and passes include_related through", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { data: { id: 9, execute_steps: ["dbt build"] } } }],
    { display },
  );
  const result = await action.execute!(
    { jobId: "9", includeRelated: "environment, most_recent_run" },
    ctx,
  ) as { execute_steps: string[] };
  assertEquals(calls[0].url.split("?")[0], "https://ab123.us1.dbt.com/api/v2/accounts/42/jobs/9/");
  assertEquals(
    new URL(calls[0].url).searchParams.get("include_related"),
    "environment,most_recent_run",
  );
  assertEquals(result.execute_steps, ["dbt build"]);
});

Deno.test("job-get: needs a job id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "jobId");
  assertEquals(calls.length, 0);
});

/** The commands, the environment and the triggers decide what a run does. */
Deno.test("job-get: names what makes a job's definition worth reading", () => {
  assert(/dbt commands/.test(action.description!), action.description);
});
