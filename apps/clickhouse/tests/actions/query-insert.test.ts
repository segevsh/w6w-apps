import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/query-insert.ts";

const D = { display: { host: "https://abc.clickhouse.cloud:8443", plane: "query" } };

const written = (rows: string) => ({
  status: 200,
  body: "",
  headers: {
    "x-clickhouse-summary": JSON.stringify({ written_rows: rows, written_bytes: "512" }),
    "x-clickhouse-query-id": "q-1",
  },
});

const rows = JSON.stringify(
  Array.from({ length: 20 }, (_, i) => ({ id: i, name: `row-${i}` })),
);

/** The whole class of quoting problems does not arise. */
Deno.test("query-insert: puts the rows in the body as JSONEachRow, not in the SQL", async () => {
  const { ctx, calls } = mockCtx([written("20")], D);
  const result = await action.execute({ table: "events", rows }, ctx) as Record<string, unknown>;
  const body = calls[0].body!;
  assert(body.startsWith("INSERT INTO events FORMAT JSONEachRow\n"), body.slice(0, 60));
  // One JSON object per line, after the statement.
  assertEquals(body.split("\n").length, 21);
  assertEquals(JSON.parse(body.split("\n")[1]), { id: 0, name: "row-0" });
  assertEquals(result.rowsWritten, 20);
  assertEquals(result.rowsSent, 20);
});

/** It is the one part that goes into the SQL, so it is checked. */
Deno.test("query-insert: the table must be an identifier", async () => {
  for (const table of ["events; DROP TABLE x", "events WHERE 1", "'events'"]) {
    const { ctx, calls } = mockCtx([], D);
    let message = "";
    try {
      await action.execute({ table, rows }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/must be an identifier/.test(message), `${table}: ${message}`);
    assertEquals(calls.length, 0);
  }
});

Deno.test("query-insert: a qualified name is allowed", async () => {
  const { ctx, calls } = mockCtx([written("20")], D);
  await action.execute({ table: "analytics.events", rows }, ctx);
  assert(calls[0].body!.startsWith("INSERT INTO analytics.events "), calls[0].body!);
});

/** Many small inserts create parts faster than merges remove them. */
Deno.test("query-insert: a tiny batch without async inserts is warned about", async () => {
  const { ctx, logs } = mockCtx([written("1")], D);
  await action.execute({ table: "events", rows: '[{"id":1}]' }, ctx);
  assertEquals(logs[0].level, "warn");
  assert(/TOO_MANY_PARTS/.test(logs[0].message), logs[0].message);

  const batched = mockCtx([written("20")], D);
  await action.execute({ table: "events", rows }, batched.ctx);
  assertEquals(batched.logs[0].level, "info");
});

/** Async inserts are the supported answer for a workflow that cannot batch. */
Deno.test("query-insert: async inserts deduplicate by default, which makes a retry safe", async () => {
  const { ctx, calls } = mockCtx([written("1")], D);
  await action.execute({ table: "events", rows: '[{"id":1}]', asyncInsert: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("async_insert"), "1");
  assertEquals(url.searchParams.get("async_insert_deduplicate"), "1");

  const off = mockCtx([written("1")], D);
  await action.execute(
    { table: "events", rows: '[{"id":1}]', asyncInsert: true, deduplicate: false },
    off.ctx,
  );
  assertEquals(new URL(off.calls[0].url).searchParams.get("async_insert_deduplicate"), "0");
});

Deno.test("query-insert: an async insert does not warn about the batch size", async () => {
  const { ctx, logs } = mockCtx([written("1")], D);
  await action.execute({ table: "events", rows: '[{"id":1}]', asyncInsert: true }, ctx);
  assertEquals(logs[0].level, "info");
});

Deno.test("query-insert: rows must be a non-empty array", async () => {
  for (const bad of [undefined, "", "[]", '{"id":1}']) {
    const { ctx, calls } = mockCtx([], D);
    let message = "";
    try {
      await action.execute({ table: "events", rows: bad }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/array|nothing to insert/.test(message), `${bad}: ${message}`);
    assertEquals(calls.length, 0);
  }
});

/** The rows are the caller's data. */
Deno.test("query-insert: logs counts only, never the rows", async () => {
  const { ctx, logs } = mockCtx([written("1")], D);
  await action.execute(
    { table: "events", rows: '[{"secret":"do-not-log"}]', asyncInsert: true },
    ctx,
  );
  assertEquals(JSON.stringify(logs).includes("do-not-log"), false);
});

/** An insert produces no result set; the count comes from the summary. */
Deno.test("query-insert: is not idempotent and says ClickHouse wants batches", () => {
  assertEquals(action.idempotent, false);
  assert(/ClickHouse wants BATCHES/.test(action.description!), action.description);
  assert(/request BODY rather than in the SQL/.test(action.description!), action.description);
});
