import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/table-create.ts";

const display = { projectId: "p1", datasetId: "d1" };
const SCHEMA = '[{"name":"id","type":"STRING","mode":"REQUIRED"}]';

Deno.test("table-create: POSTs a qualified reference and wraps the field list", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "p1:d1.t1" } }], { display });
  await action.execute!({ tableId: "t1", schema: SCHEMA }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/bigquery/v2/projects/p1/datasets/d1/tables");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.tableReference, { projectId: "p1", datasetId: "d1", tableId: "t1" });
  // BigQuery wants `schema: {fields: [...]}`, not a bare array.
  assertEquals(body.schema, { fields: [{ name: "id", type: "STRING", mode: "REQUIRED" }] });
});

/** Partitioning is what decides how much a later query scans — and bills. */
Deno.test("table-create: partitioning and clustering pass through as objects", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({
    tableId: "t1",
    schema: SCHEMA,
    timePartitioning: '{"type":"DAY","field":"created_at"}',
    clustering: '{"fields":["customer_id"]}',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.timePartitioning, { type: "DAY", field: "created_at" });
  assertEquals(body.clustering, { fields: ["customer_id"] });
});

Deno.test("table-create: an empty or non-array schema is refused locally", async () => {
  for (const schema of ["[]", '{"name":"id"}']) {
    const { ctx, calls } = mockCtx([], { display });
    await assertRejects(
      async () => await action.execute!({ tableId: "t1", schema }, ctx),
      Error,
      "`schema` is required",
    );
    assertEquals(calls.length, 0);
  }
});

Deno.test("table-create: a blank table id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ schema: SCHEMA }, ctx),
    Error,
    "`tableId`",
  );
  assertEquals(calls.length, 0);
});
