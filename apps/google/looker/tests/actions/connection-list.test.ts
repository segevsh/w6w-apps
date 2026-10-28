import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/connection-list.ts";

const D = { display: { host: "https://mycompany.cloud.looker.com" } };

const connections = [
  {
    name: "warehouse",
    dialect_name: "bigquery_standard_sql",
    host: "",
    database: "analytics",
    max_connections: 30,
    uses_tmp_table: true,
  },
  {
    name: "reporting",
    dialect_name: "postgres",
    host: "db.internal",
    database: "reporting",
    max_connections: 5,
    uses_tmp_table: false,
  },
];

/** This is where a query's cost lands. */
Deno.test("connection-list: reports the dialects and the databases", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: connections }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/4.0/connections");
  assertEquals(result.count, 2);
  assertEquals(result.names, ["warehouse", "reporting"]);
  assertEquals(result.dialects, ["bigquery_standard_sql", "postgres"]);
});

/** Queries share the pool with everybody in the interface. */
Deno.test("connection-list: finds the tightest concurrency ceiling", async () => {
  const { ctx } = mockCtx([{ status: 200, body: connections }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals((result.smallestPool as { name: string }).name, "reporting");
  assertEquals((result.smallestPool as { maxConnections: number }).maxConnections, 5);
});

/** A derived-table build is a much larger operation than a SELECT. */
Deno.test("connection-list: names the connections where a query can build tables", async () => {
  const { ctx } = mockCtx([{ status: 200, body: connections }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.pdtEnabled, ["warehouse"]);
});

/** Looker omits connection passwords, and nothing here asks for them. */
Deno.test("connection-list: requests no credential field", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], D);
  await action.execute({}, ctx);
  const fields = new URL(calls[0].url).searchParams.get("fields")!;
  assert(!/password|certificate|secret/i.test(fields), fields);
});

Deno.test("connection-list: a connection with no pool leaves smallestPool undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ name: "x", dialect_name: "mysql" }] }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.smallestPool, undefined);
  assertEquals(result.pdtEnabled, []);
});

Deno.test("connection-list: takes no parameters", () => {
  assertEquals(action.params, []);
  assertEquals(action.type, "read");
});
