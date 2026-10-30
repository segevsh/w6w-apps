import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import sqlQuery from "../../actions/sql-query.ts";
import { BASE_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("sql-query: POSTs the statement with convert_keys on by default", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, results: [{ Name: "A" }], metadata: [] },
  }]);
  const out = await sqlQuery.execute({ sql: "SELECT * FROM Table1 LIMIT 5" }, ctx) as {
    results: unknown[];
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/sql/`);
  assertEquals(bodyOf(calls[0]), { sql: "SELECT * FROM Table1 LIMIT 5", convert_keys: true });
  assertEquals(out.results.length, 1);
});

test("sql-query: parameters are bound, accepting an array or its JSON text", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }, { body: { results: [] } }]);
  await sqlQuery.execute({ sql: "SELECT * FROM T WHERE a = ?", parameters: ["x"] }, ctx);
  await sqlQuery.execute({ sql: "SELECT * FROM T WHERE a = ?", parameters: '["x", 3]' }, ctx);
  assertEquals(bodyOf(calls[0]).parameters, ["x"]);
  assertEquals(bodyOf(calls[1]).parameters, ["x", 3]);
});

test("sql-query: convertKeys=false and serverOnly are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await sqlQuery.execute({ sql: "SELECT 1", convertKeys: false, serverOnly: true }, ctx);
  assertEquals(bodyOf(calls[0]).convert_keys, false);
  assertEquals(bodyOf(calls[0]).server_only, true);
});

test("sql-query: non-array parameters are rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await sqlQuery.execute({ sql: "SELECT ?", parameters: '{"a":1}' }, ctx);
    },
    Error,
    "must be a JSON array",
  );
  assertEquals(calls.length, 0);
});

test("sql-query: is not declared idempotent (it can UPDATE and DELETE)", () => {
  assertEquals(sqlQuery.idempotent, false);
});
