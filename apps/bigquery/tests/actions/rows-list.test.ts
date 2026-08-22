import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/rows-list.ts";

const display = { projectId: "p1", datasetId: "d1" };

/**
 * tabledata.list reads a table without running a query — no bytes billed — but
 * returns rows without a schema, so the schema is fetched to decode them.
 */
Deno.test("rows-list: reads the data endpoint then the table, and decodes", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { rows: [{ f: [{ v: "ada" }] }], totalRows: "1" } },
    { status: 200, body: { schema: { fields: [{ name: "name", type: "STRING" }] } } },
  ], { display });
  const result = await action.execute!({ tableId: "t1" }, ctx) as Record<string, unknown>;
  assertEquals(
    new URL(calls[0].url).pathname,
    "/bigquery/v2/projects/p1/datasets/d1/tables/t1/data",
  );
  assertEquals(new URL(calls[1].url).pathname, "/bigquery/v2/projects/p1/datasets/d1/tables/t1");
  assertEquals(result.rows, [{ name: "ada" }]);
});

Deno.test("rows-list: selected fields go as a comma-joined string", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { rows: [] } },
    { status: 200, body: {} },
  ], { display });
  await action.execute!({ tableId: "t1", selectedFields: "a, b" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("selectedFields"), "a,b");
});

Deno.test("rows-list: a blank table fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`tableId`");
  assertEquals(calls.length, 0);
});
