import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/run-artifact-get.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };
const runResults = JSON.stringify({
  results: [
    { unique_id: "model.shop.dim_users", status: "success" },
    { unique_id: "model.shop.fct_orders", status: "error" },
    { unique_id: "test.shop.not_null", status: "fail" },
  ],
});

Deno.test("run-artifact-get: downloads and parses the artifact by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: runResults }], { display });
  const result = await action.execute!({ runId: "7", path: "run_results.json" }, ctx) as {
    artifact: { results: unknown[] };
  };
  assertEquals(
    calls[0].url,
    "https://ab123.us1.dbt.com/api/v2/accounts/42/runs/7/artifacts/run_results.json",
  );
  assertEquals(result.artifact.results.length, 3);
});

/**
 * `run_results.json`'s useful half is the per-node outcome — "these four models
 * failed" rather than "the build failed".
 */
Deno.test("run-artifact-get: summary mode separates the nodes that did not pass", async () => {
  const { ctx } = mockCtx([{ status: 200, body: runResults }], { display });
  const result = await action.execute!(
    { runId: "7", path: "run_results.json", mode: "summary" },
    ctx,
  ) as { count: number; failedCount: number; failed: Array<{ unique_id: string }> };
  assertEquals(result.count, 3);
  assertEquals(result.failedCount, 2);
  assertEquals(result.failed.map((f) => f.unique_id), [
    "model.shop.fct_orders",
    "test.shop.not_null",
  ]);
});

Deno.test("run-artifact-get: summary mode refuses an artifact with no results array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: '{"nodes":{}}' }], { display });
  await assertRejects(
    async () => await action.execute!({ runId: "7", path: "manifest.json", mode: "summary" }, ctx),
    Error,
    "no `results` array",
  );
});

/** manifest.json can be tens of megabytes; parsing it is sometimes the mistake. */
Deno.test("run-artifact-get: raw mode returns the text untouched", async () => {
  const { ctx } = mockCtx([{ status: 200, body: '{"nodes":{}}' }], { display });
  const result = await action.execute!(
    { runId: "7", path: "manifest.json", mode: "raw" },
    ctx,
  ) as { raw: string };
  assertEquals(result.raw, '{"nodes":{}}');
});

Deno.test("run-artifact-get: a step and a nested path are both encoded correctly", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "{}" }], { display });
  await action.execute!({ runId: "7", path: "/compiled/shop/model.sql", step: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/accounts/42/runs/7/artifacts/compiled/shop/model.sql");
  assertEquals(url.searchParams.get("step"), "2");
});

Deno.test("run-artifact-get: logs the size it fetched, which is the thing to watch", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: runResults }], { display });
  await action.execute!({ runId: "7", path: "run_results.json" }, ctx);
  assertEquals(logs[0].data, {
    runId: "7",
    path: "run_results.json",
    bytes: runResults.length,
  });
});

Deno.test("run-artifact-get: needs a run id and a path", async () => {
  const noRun = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({ path: "x" }, noRun.ctx), Error, "runId");
  const noPath = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ runId: "7", path: " " }, noPath.ctx),
    Error,
    "path",
  );
});

/** The default is the LAST step, which on a test-ending job is not the build. */
Deno.test("run-artifact-get: the step param warns what the default actually selects", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>).find((p) => p.key === "step")!;
  assert(/dbt test/.test(p.hint!), p.hint);
});
