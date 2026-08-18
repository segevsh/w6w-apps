import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/query-run.ts";

const display = { projectId: "p1", datasetId: "d1" };

Deno.test("query-run: POSTs to the queries endpoint with standard SQL pinned", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { jobComplete: true } }], { display });
  await action.execute!({ query: "SELECT 1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/bigquery/v2/projects/p1/queries");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.query, "SELECT 1");
  // Legacy SQL silently changes semantics, so it is never enabled.
  assertEquals(body.useLegacySql, false);
});

/** The whole point of the decoder: positional cells become named fields. */
Deno.test("query-run: decodes rows and keeps the raw form", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      jobComplete: true,
      schema: { fields: [{ name: "name", type: "STRING" }, { name: "n", type: "INTEGER" }] },
      rows: [{ f: [{ v: "ada" }, { v: "36" }] }],
    },
  }], { display });
  const result = await action.execute!({ query: "SELECT 1" }, ctx) as Record<string, unknown>;
  assertEquals(result.rows, [{ name: "ada", n: "36" }]);
  assertEquals(result.rawRows, [{ f: [{ v: "ada" }, { v: "36" }] }]);
});

Deno.test("query-run: a schema-less response passes through untouched", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { jobComplete: false, jobReference: { jobId: "j" } },
  }], {
    display,
  });
  const result = await action.execute!({ query: "SELECT 1" }, ctx) as Record<string, unknown>;
  // Not complete: the caller gets the job reference, not invented rows.
  assertEquals(result.jobComplete, false);
  assertEquals(result.rows, undefined);
});

Deno.test("query-run: dry run and the cost ceiling reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({
    query: "SELECT 1",
    dryRun: true,
    maximumBytesBilled: "1000000",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.dryRun, true);
  assertEquals(body.maximumBytesBilled, "1000000");
});

Deno.test("query-run: the default dataset is qualified with the project", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ query: "SELECT 1", defaultDatasetId: "analytics" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).defaultDataset, {
    projectId: "p1",
    datasetId: "analytics",
  });
});

Deno.test("query-run: query parameters pass through as parsed JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({
    query: "SELECT @x",
    queryParameters: '[{"name":"x","parameterType":{"type":"INT64"},' +
      '"parameterValue":{"value":"1"}}]',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).queryParameters[0].name, "x");
});

Deno.test("query-run: SQL is required and a project must be resolvable", async () => {
  const noSql = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, noSql.ctx), Error, "`query`");
  const noProject = mockCtx([], { display: {} });
  const err = await assertRejects(
    async () => await action.execute!({ query: "SELECT 1" }, noProject.ctx),
    Error,
  );
  assert(err.message.includes("project"), err.message);
  assertEquals(noSql.calls.length + noProject.calls.length, 0);
});
