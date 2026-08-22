import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/table-get.ts";

const display = { projectId: "p1", datasetId: "d1" };

Deno.test("table-get: fetches the table, which is where the schema lives", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "p1:d1.t1", schema: { fields: [{ name: "a", type: "STRING" }] }, numRows: "42" },
  }], { display });
  const result = await action.execute!({ tableId: "t1" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/bigquery/v2/projects/p1/datasets/d1/tables/t1");
  assertEquals(result.numRows, "42");
  // table-list does not return a schema; this action is the one that does.
  const outputs = action.output as Array<{ key: string }>;
  assert(outputs.some((o) => o.key === "schema"));
});

Deno.test("table-get: a blank table id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`tableId`");
  assertEquals(calls.length, 0);
});
