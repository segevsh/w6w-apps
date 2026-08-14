import { assert, assertEquals } from "@std/assert";
import catalogCreate from "../../actions/catalog-create.ts";
import catalogDelete from "../../actions/catalog-delete.ts";
import catalogGet from "../../actions/catalog-get.ts";
import catalogList from "../../actions/catalog-list.ts";
import sqlStatementExecute from "../../actions/sql-statement-execute.ts";
import sqlStatementGet from "../../actions/sql-statement-get.ts";
import tableGet from "../../actions/table-get.ts";
import tableList from "../../actions/table-list.ts";
import { mockDatabricksCtx, WORKSPACE_URL } from "../_helpers.ts";

const at = (path: string) => `${WORKSPACE_URL}${path}`;

// ------------------------------------------------------------ sql statements --

/**
 * Databricks' statement API is asynchronous by contract: it answers within
 * `wait_timeout` when it can, and otherwise hands back a `statement_id` in a
 * PENDING/RUNNING state. `on_wait_timeout: "CONTINUE"` is what makes the second
 * case a handoff rather than a cancellation — the query keeps running and
 * `sql-statement-get` picks it up.
 */
Deno.test("sql-statement-execute: POSTs with the documented max wait and CONTINUE", async () => {
  const { ctx, calls } = mockDatabricksCtx([{
    body: { statement_id: "01ef", status: { state: "SUCCEEDED" } },
  }]);
  const result = await sqlStatementExecute.execute(
    { warehouseId: "wh1", statement: "SELECT 1" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, at("/api/2.0/sql/statements"));
  assertEquals(JSON.parse(calls[0].body!), {
    warehouse_id: "wh1",
    statement: "SELECT 1",
    wait_timeout: "50s",
    on_wait_timeout: "CONTINUE",
  });
  assertEquals(result, { statement_id: "01ef", status: { state: "SUCCEEDED" } });
});

/** Catalog and schema are optional context; omitted params must not be sent at all. */
Deno.test("sql-statement-execute: sends catalog/schema only when given", async () => {
  const { ctx, calls } = mockDatabricksCtx([{ body: {} }, { body: {} }]);

  await sqlStatementExecute.execute(
    { warehouseId: "wh1", statement: "SELECT 1", catalog: "main", schema: "default" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).catalog, "main");
  assertEquals(JSON.parse(calls[0].body!).schema, "default");

  await sqlStatementExecute.execute({ warehouseId: "wh1", statement: "SELECT 1" }, ctx);
  assertEquals("catalog" in JSON.parse(calls[1].body!), false);
  assertEquals("schema" in JSON.parse(calls[1].body!), false);
});

/**
 * A still-running query is a real result, not an error: the action returns
 * whatever Databricks answered rather than polling, because one Action execution
 * has no good way to block for an unbounded time.
 */
Deno.test("sql-statement-execute: returns a PENDING answer as-is", async () => {
  const { ctx } = mockDatabricksCtx([{
    body: { statement_id: "01ef", status: { state: "PENDING" } },
  }]);
  const result = await sqlStatementExecute.execute(
    { warehouseId: "wh1", statement: "SELECT count(*) FROM huge" },
    ctx,
  ) as { status: { state: string } };
  assertEquals(result.status.state, "PENDING");
});

/** Running SQL is not repeatable, and the manifest has to say so. */
Deno.test("sql-statement-execute: declares itself non-idempotent", () => {
  assertEquals(sqlStatementExecute.type, "perform");
  assertEquals(sqlStatementExecute.idempotent, false);
});

Deno.test("sql-statement-get: GETs the statement by id", async () => {
  const { ctx, calls } = mockDatabricksCtx([{
    body: { statement_id: "01ef", status: { state: "SUCCEEDED" } },
  }]);
  const result = await sqlStatementGet.execute({ statementId: "01ef" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, at("/api/2.0/sql/statements/01ef"));
  assertEquals((result as { status: { state: string } }).status.state, "SUCCEEDED");
});

// ------------------------------------------------------------- unity catalog --

Deno.test("catalog-list: GETs the Unity Catalog catalogs collection", async () => {
  const { ctx, calls } = mockDatabricksCtx([{ body: { catalogs: [{ name: "main" }] } }]);
  const result = await catalogList.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, at("/api/2.1/unity-catalog/catalogs"));
  assertEquals(result, { catalogs: [{ name: "main" }] });
});

Deno.test("catalog-get: GETs one catalog by name", async () => {
  const { ctx, calls } = mockDatabricksCtx([{ body: { name: "main" } }]);
  await catalogGet.execute({ catalogName: "main" }, ctx);
  assertEquals(calls[0].url, at("/api/2.1/unity-catalog/catalogs/main"));
});

Deno.test("catalog-create: POSTs the name, and the comment only when given", async () => {
  const { ctx, calls } = mockDatabricksCtx([{ body: { name: "new" } }, { body: { name: "new" } }]);

  await catalogCreate.execute({ name: "new", comment: "why it exists" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, at("/api/2.1/unity-catalog/catalogs"));
  assertEquals(JSON.parse(calls[0].body!), { name: "new", comment: "why it exists" });

  await catalogCreate.execute({ name: "new" }, ctx);
  assertEquals(JSON.parse(calls[1].body!), { name: "new" });
});

/**
 * The delete endpoint answers with no body, so the action synthesises the one
 * fact worth returning rather than handing back `undefined`.
 */
Deno.test("catalog-delete: DELETEs by name and reports the deletion", async () => {
  const { ctx, calls } = mockDatabricksCtx([{ status: 204 }]);
  const result = await catalogDelete.execute({ catalogName: "old" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, at("/api/2.1/unity-catalog/catalogs/old"));
  assertEquals(result, { deleted: true });
});

Deno.test("table-list: passes catalog and schema as query params", async () => {
  const { ctx, calls } = mockDatabricksCtx([{ body: { tables: [] } }]);
  await tableList.execute({ catalogName: "main", schemaName: "default" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/2.1/unity-catalog/tables");
  assertEquals(url.searchParams.get("catalog_name"), "main");
  assertEquals(url.searchParams.get("schema_name"), "default");
});

/** Both narrowing params are optional; omitting them must not send empty values. */
Deno.test("table-list: omits the params the caller left unset", async () => {
  const { ctx, calls } = mockDatabricksCtx([{ body: { tables: [] } }]);
  await tableList.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("catalog_name"), false);
  assertEquals(url.searchParams.has("schema_name"), false);
});

/** Unity Catalog addresses a table by its three-level name, not by an id. */
Deno.test("table-get: GETs by the full catalog.schema.table name", async () => {
  const { ctx, calls } = mockDatabricksCtx([{ body: { name: "my_table" } }]);
  await tableGet.execute({ fullName: "main.default.my_table" }, ctx);
  assertEquals(calls[0].url, at("/api/2.1/unity-catalog/tables/main.default.my_table"));
});

// ------------------------------------------------------------------ contract --

/** A failure from the workspace has to surface, not be swallowed into a result. */
Deno.test("actions: a vendor error propagates to the caller", async () => {
  const { ctx } = mockDatabricksCtx([{
    status: 404,
    statusText: "Not Found",
    body: '{"error_code":"CATALOG_DOES_NOT_EXIST"}',
  }]);
  const err = await Promise.resolve(catalogGet.execute({ catalogName: "missing" }, ctx))
    .then(() => null)
    .catch((e: unknown) => e as Error);
  assert(err instanceof Error);
  assert(err.message.includes("CATALOG_DOES_NOT_EXIST"), err.message);
});

/** Credentials are the `sign` hook's business; no action may add its own header. */
Deno.test("actions: no action sends an Authorization header", async () => {
  const { ctx, calls } = mockDatabricksCtx([{ body: {} }, { body: {} }]);
  await catalogList.execute({}, ctx);
  await sqlStatementExecute.execute({ warehouseId: "wh1", statement: "SELECT 1" }, ctx);
  for (const call of calls) assertEquals(call.headers["authorization"], undefined);
});
