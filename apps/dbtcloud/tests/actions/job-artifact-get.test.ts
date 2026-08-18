import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-artifact-get.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };

Deno.test("job-artifact-get: fetches from the job path, not a run", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: '{"nodes":{}}' }], { display });
  const result = await action.execute!({ jobId: "9", path: "manifest.json" }, ctx) as {
    artifact: unknown;
  };
  assertEquals(
    calls[0].url,
    "https://ab123.us1.dbt.com/api/v2/accounts/42/jobs/9/artifacts/manifest.json",
  );
  assertEquals(result.artifact, { nodes: {} });
});

Deno.test("job-artifact-get: raw mode skips parsing a large manifest", async () => {
  const { ctx } = mockCtx([{ status: 200, body: '{"nodes":{}}' }], { display });
  const result = await action.execute!({ jobId: "9", mode: "raw" }, ctx) as { raw: string };
  assertEquals(result.raw, '{"nodes":{}}');
});

/**
 * It reads the last SUCCESSFUL run, so a job failing for a week returns a
 * week-old manifest without complaint.
 */
Deno.test("job-artifact-get: says its artifact may be stale on a failing job", () => {
  assert(/SUCCESSFUL/.test(action.description!), action.description);
  assert(/without complaint/.test(action.description!), action.description);
});

Deno.test("job-artifact-get: needs a job id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "jobId");
  assertEquals(calls.length, 0);
});
