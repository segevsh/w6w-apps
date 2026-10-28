import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/rows-insert.ts";

const display = { projectId: "p1", datasetId: "d1" };

Deno.test("rows-insert: wraps plain objects in BigQuery's json envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ tableId: "t1", rows: '[{"name":"ada"}]' }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/bigquery/v2/projects/p1/datasets/d1/tables/t1/insertAll",
  );
  assertEquals(JSON.parse(calls[0].body!).rows, [{ json: { name: "ada" } }]);
});

Deno.test("rows-insert: a row that already carries insertId/json is passed through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({
    tableId: "t1",
    rows: '[{"insertId":"mine","json":{"name":"ada"}}]',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).rows, [{ insertId: "mine", json: { name: "ada" } }]);
});

/** insertId is BigQuery's de-dup key — this is what makes a retry safe. */
Deno.test("rows-insert: the opt-in derives a stable insertId per row", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  (ctx as { invocation?: unknown }).invocation = { invocationId: "inv1" };
  await action.execute!({
    tableId: "t1",
    rows: '[{"a":1},{"a":2}]',
    useInvocationInsertId: true,
  }, ctx);
  const rows = JSON.parse(calls[0].body!).rows;
  assertEquals(rows[0].insertId, "inv1:0");
  assertEquals(rows[1].insertId, "inv1:1");
});

/**
 * insertAll answers 200 even when rows were rejected — a caller that only
 * checks for an exception would silently drop them.
 */
Deno.test("rows-insert: a partial failure is counted, not hidden", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { insertErrors: [{ index: 1, errors: [{ reason: "invalid" }] }] },
  }], { display });
  const result = await action.execute!({ tableId: "t1", rows: '[{"a":1},{"a":2}]' }, ctx) as {
    insertedRows: number;
    insertErrors: unknown[];
  };
  assertEquals(result.insertedRows, 1);
  assertEquals(result.insertErrors.length, 1);
});

Deno.test("rows-insert: is honestly non-idempotent, and needs rows", async () => {
  assertEquals(action.idempotent, false);
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ tableId: "t1", rows: "[]" }, ctx),
    Error,
    "`rows`",
  );
  assertEquals(calls.length, 0);
});
