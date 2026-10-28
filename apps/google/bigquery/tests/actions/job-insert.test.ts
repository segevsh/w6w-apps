import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-insert.ts";

const display = { projectId: "p1" };

Deno.test("job-insert: posts the configuration as given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "p1:j1" } }], { display });
  await action.execute!({
    configuration: '{"query":{"query":"SELECT 1","useLegacySql":false}}',
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/bigquery/v2/projects/p1/jobs");
  assertEquals(JSON.parse(calls[0].body!).configuration.query.query, "SELECT 1");
});

/** BigQuery takes exactly one job type; naming both beats a vague 400. */
Deno.test("job-insert: refuses a configuration with two job types", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ configuration: '{"query":{},"load":{}}' }, ctx),
    Error,
    "only one job type",
  );
  assertEquals(calls.length, 0);
});

Deno.test("job-insert: refuses a configuration with no job type", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ configuration: '{"nope":{}}' }, ctx),
    Error,
    "query, load, extract or copy",
  );
  assertEquals(calls.length, 0);
});

/** A supplied job id is what makes a retry re-attach instead of double-running. */
Deno.test("job-insert: the opt-in derives a job id from the invocation", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  (ctx as { invocation?: unknown }).invocation = { invocationId: "inv-1:2" };
  await action.execute!({
    configuration: '{"query":{"query":"SELECT 1"}}',
    useInvocationJobId: true,
  }, ctx);
  const ref = JSON.parse(calls[0].body!).jobReference;
  // BigQuery job ids allow only letters, numbers, underscores and dashes.
  assertEquals(ref.jobId, "w6w_inv-1_2");
  assertEquals(ref.projectId, "p1");
});

Deno.test("job-insert: is honestly non-idempotent", () => {
  assertEquals(action.idempotent, false);
});
