import { assertEquals, assertRejects } from "@std/assert";
import queryRun from "../../actions/query-run.ts";
import queryExport from "../../actions/query-export.ts";
import { mockMetabaseCtx, queryOk, SITE_URL } from "../_helpers.ts";

/**
 * Metabase keys the query body by its own language name — `native` for SQL,
 * `query` for MBQL. Sending the wrong key is a 400, not a silent empty result.
 */
Deno.test("query-run: a native query goes under `native`", async () => {
  const { ctx, calls } = mockMetabaseCtx([queryOk([[42]])]);
  await queryRun.execute({
    database: 1,
    type: "native",
    query: { query: "SELECT count(*) FROM orders" },
  }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/api/dataset`);
  assertEquals(JSON.parse(calls[0].body!), {
    database: 1,
    type: "native",
    native: { query: "SELECT count(*) FROM orders" },
  });
});

Deno.test("query-run: an MBQL query goes under `query`", async () => {
  const { ctx, calls } = mockMetabaseCtx([queryOk()]);
  await queryRun.execute({
    database: 1,
    type: "query",
    query: { "source-table": 2, limit: 10 },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    database: 1,
    type: "query",
    query: { "source-table": 2, limit: 10 },
  });
});

Deno.test("query-run: defaults to native", async () => {
  const { ctx, calls } = mockMetabaseCtx([queryOk()]);
  await queryRun.execute({ database: 1, query: '{"query":"SELECT 1"}' }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "native");
  assertEquals(body.native, { query: "SELECT 1" });
});

Deno.test("query-run: a failed query throws rather than returning zero rows", async () => {
  const { ctx } = mockMetabaseCtx([{
    status: 400,
    body: {
      status: "failed",
      error: "[SQLITE_ERROR] no such table: nope_xyz",
      error_type: "invalid-query",
    },
  }]);
  await assertRejects(
    async () =>
      await queryRun.execute({ database: 1, query: '{"query":"SELECT * FROM nope_xyz"}' }, ctx),
    Error,
    "400",
  );
});

Deno.test("query-run: a required query is required", async () => {
  const { ctx } = mockMetabaseCtx([]);
  await assertRejects(
    async () => await queryRun.execute({ database: 1, query: "" }, ctx),
    Error,
    "is required",
  );
});

/**
 * The shape difference that is easy to miss: `POST /api/dataset` takes the query
 * flat, `POST /api/dataset/{format}` takes it NESTED under `query`. Sending the
 * flat shape to the export path is a 400 —
 * `{"specific-errors":{"query":["missing required key, received: nil"]}}`,
 * verified on the wire.
 */
Deno.test("query-export: nests the whole query under `query`, unlike /api/dataset", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ status: 200, body: "a\n1\n" }]);
  const out = await queryExport.execute({
    database: 1,
    type: "native",
    query: { query: "SELECT 1 AS a" },
    format: "csv",
  }, ctx) as { format: string; content: string };

  assertEquals(out, { format: "csv", content: "a\n1\n" });
  assertEquals(calls[0].url, `${SITE_URL}/api/dataset/csv`);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.query, {
    database: 1,
    type: "native",
    native: { query: "SELECT 1 AS a" },
  });
  assertEquals(body.format_rows, false);
  // The flat members must NOT also appear at the top level.
  assertEquals("database" in body, false);
  assertEquals("native" in body, false);
});

Deno.test("query-export: MBQL nests the same way", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ status: 200, body: "[]" }]);
  await queryExport.execute({
    database: 3,
    type: "query",
    query: { "source-table": 9 },
    format: "json",
  }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/api/dataset/json`);
  assertEquals(JSON.parse(calls[0].body!).query, {
    database: 3,
    type: "query",
    query: { "source-table": 9 },
  });
});
