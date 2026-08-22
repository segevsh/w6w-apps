import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/table-list.ts";

const D = { display: { host: "https://abc.clickhouse.cloud:8443", plane: "query" } };

const tables = (rows: Array<Record<string, unknown>>) => ({
  status: 200,
  body: JSON.stringify({ meta: [], data: rows, rows: rows.length }),
  headers: { "content-type": "application/json", "x-clickhouse-summary": "{}" },
});

const row = (name: string, engine: string, parts: number, bytes = 1000) => ({
  database: "default",
  name,
  engine,
  rows: 1000,
  bytes,
  parts,
});

Deno.test("table-list: reads system.tables joined to system.parts", async () => {
  const { ctx, calls } = mockCtx([tables([row("events", "MergeTree", 12)])], D);
  const result = await action.execute({ database: "default" }, ctx) as Record<string, unknown>;
  assert(/system\.tables/.test(calls[0].body!), calls[0].body!);
  // The part count is not on system.tables alone.
  assert(/system\.parts/.test(calls[0].body!), calls[0].body!);
  assertEquals(new URL(calls[0].url).searchParams.get("param_db"), "default");
  assertEquals(result.names, ["default.events"]);
});

/** System databases are noise unless asked for. */
Deno.test("table-list: excludes the system databases when no database is named", async () => {
  const { ctx, calls } = mockCtx([tables([])], D);
  await action.execute({ database: "" }, ctx);
  assert(/database NOT IN \('system'/.test(calls[0].body!), calls[0].body!);

  const included = mockCtx([tables([])], D);
  await action.execute({ database: "", includeSystem: true }, included.ctx);
  assertEquals(/NOT IN/.test(included.calls[0].body!), false);
});

/** Inserts outrunning merges is what a high part count means. */
Deno.test("table-list: flags tables whose part count predicts TOO_MANY_PARTS", async () => {
  const { ctx, logs } = mockCtx([tables([
    row("events", "MergeTree", 900),
    row("users", "MergeTree", 4),
  ])], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.highPartTables, ["default.events"]);
  assertEquals(logs[0].level, "warn");
  assert(/inserts are outrunning merges/.test(logs[0].message), logs[0].message);
});

Deno.test("table-list: a healthy set of tables does not warn", async () => {
  const { ctx, logs } = mockCtx([tables([row("events", "MergeTree", 4)])], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.highPartTables, []);
  assertEquals(logs.length, 0);
});

/** A "table" may be a view, a dictionary or a Kafka consumer. */
Deno.test("table-list: reports the distinct engines", async () => {
  const { ctx } = mockCtx([tables([
    row("events", "MergeTree", 1),
    row("events_mv", "MaterializedView", 0),
    row("dict", "Dictionary", 0),
  ])], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.engines, ["Dictionary", "MaterializedView", "MergeTree"]);
});

Deno.test("table-list: totals the rows and the compressed bytes", async () => {
  const { ctx } = mockCtx([tables([
    row("a", "MergeTree", 1, 5000),
    row("b", "MergeTree", 1, 3000),
  ])], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.totalRows, 2000);
  assertEquals(result.totalBytes, 8000);
});

Deno.test("table-list: runs read-only", async () => {
  const { ctx, calls } = mockCtx([tables([])], D);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("readonly"), "1");
});
