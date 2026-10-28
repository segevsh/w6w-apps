import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/query-results-get.ts";

const display = { projectId: "p1" };

Deno.test("query-results-get: fetches and decodes a job's rows", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      jobComplete: true,
      schema: { fields: [{ name: "a", type: "STRING" }] },
      rows: [{ f: [{ v: "x" }] }],
    },
  }], { display });
  const result = await action.execute!({ jobId: "j1" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/bigquery/v2/projects/p1/queries/j1");
  assertEquals(result.rows, [{ a: "x" }]);
});

/** Jobs are regional; omitting the location for a non-default region 404s. */
Deno.test("query-results-get: passes the job's location and page token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ jobId: "j1", location: "EU", pageToken: "tok" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("location"), "EU");
  assertEquals(q.get("pageToken"), "tok");
});

Deno.test("query-results-get: a blank job id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`jobId`");
  assertEquals(calls.length, 0);
});
