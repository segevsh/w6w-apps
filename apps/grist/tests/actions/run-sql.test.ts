import { assert, assertEquals } from "@std/assert";
import { actionCtx } from "../_helpers.ts";
import action from "../../actions/run-sql.ts";

Deno.test("run-sql: POSTs to /sql with the statement in the body", async () => {
  const { ctx, calls } = actionCtx([{ body: { statement: "select 1", records: [] } }]);
  await action.execute!({ docId: "9PJhBDZ", sql: "select 1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/docs/9PJhBDZ/sql");
  assertEquals(JSON.parse(calls[0].body!), { sql: "select 1" });
  // The statement must never leak into the query string — that is the GET form,
  // which cannot take bound parameters.
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("run-sql: binds args rather than interpolating them", async () => {
  const { ctx, calls } = actionCtx([{ body: { statement: "", records: [] } }]);
  await action.execute!(
    { docId: "d", sql: "select * from Pets where popularity >= ?", args: [50] },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.sql, "select * from Pets where popularity >= ?");
  assertEquals(body.args, [50]);
  assert(!body.sql.includes("50"), "the value must stay in args, not the statement");
});

Deno.test("run-sql: omits args and timeout when they were not supplied", async () => {
  const { ctx, calls } = actionCtx([{ body: { statement: "", records: [] } }]);
  await action.execute!({ docId: "d", sql: "select 1", args: [] }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(body), ["sql"]);
});

Deno.test("run-sql: forwards a timeout, including 0", async () => {
  const { ctx, calls } = actionCtx([
    { body: { statement: "", records: [] } },
    { body: { statement: "", records: [] } },
  ]);
  await action.execute!({ docId: "d", sql: "select 1", timeout: 500 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).timeout, 500);

  await action.execute!({ docId: "d", sql: "select 1", timeout: 0 }, ctx);
  assertEquals(JSON.parse(calls[1].body!).timeout, 0);
});

Deno.test("run-sql: returns the echoed statement and the rows", async () => {
  const { ctx } = actionCtx([{
    body: {
      statement: "select * from Pets",
      records: [{ fields: { id: 1, pet: "cat" } }, { fields: { id: 2, pet: "dog" } }],
    },
  }]);
  const out = await action.execute!({ docId: "d", sql: "select * from Pets" }, ctx);
  assertEquals(out.statement, "select * from Pets");
  assertEquals(out.records.map((r) => r.fields.pet), ["cat", "dog"]);
});

Deno.test("run-sql: is a search, not a perform — the endpoint is read-only", () => {
  assertEquals(action.type, "search");
  assertEquals(action.idempotent, undefined);
});
