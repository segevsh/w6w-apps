import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  DEFAULT_PORT,
  describeQueryError,
  hostFromConnection,
  normalizeHost,
  parseException,
  parseSummary,
  QueryClient,
} from "../../lib/query.ts";

const D = { display: { host: "https://abc.eu-west-1.aws.clickhouse.cloud:8443", plane: "query" } };

const jsonResult = (rows: unknown[], meta: unknown[] = []) => ({
  status: 200,
  body: JSON.stringify({ meta, data: rows, rows: rows.length }),
  headers: {
    "content-type": "application/json",
    "x-clickhouse-summary": JSON.stringify({
      read_rows: "1000000",
      read_bytes: "8000000",
      written_rows: "0",
      result_rows: "1",
      elapsed_ns: "1500000",
      memory_usage: "1147327",
    }),
    "x-clickhouse-query-id": "q-1",
  },
});

/** HTTPS is on 8443, and a host without it reaches 443 where nothing answers. */
Deno.test("normalizeHost: adds the ClickHouse HTTPS port when it is missing", () => {
  assertEquals(DEFAULT_PORT, 8443);
  assertEquals(normalizeHost("abc.clickhouse.cloud"), "https://abc.clickhouse.cloud:8443");
  assertEquals(
    normalizeHost("https://abc.clickhouse.cloud"),
    "https://abc.clickhouse.cloud:8443",
  );
  assertEquals(
    normalizeHost("https://abc.clickhouse.cloud:9440"),
    "https://abc.clickhouse.cloud:9440",
  );
  assertThrows(() => normalizeHost(""), Error, "required");
});

/** A control-plane connection cannot run SQL, and the error says which it is. */
Deno.test("hostFromConnection: an API-key connection is refused with the reason", () => {
  const queryConn = mockCtx([], D);
  assertEquals(
    hostFromConnection(queryConn.ctx.connection),
    "https://abc.eu-west-1.aws.clickhouse.cloud:8443",
  );

  const control = mockCtx([], { display: { organizationId: "org-1", plane: "control" } });
  const err = assertThrows(() => hostFromConnection(control.ctx.connection), Error);
  assert(/organisation API KEY connection/.test(err.message), err.message);
  assert(/needs a service connection/.test(err.message), err.message);
});

/** SQL goes in the body; the format and the buffering go in the query string. */
Deno.test("run: posts SQL as the body and asks for JSON", async () => {
  const { ctx, calls } = mockCtx([jsonResult([{ n: 1 }])], D);
  await new QueryClient(ctx).run("SELECT 1 AS n");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, "SELECT 1 AS n");
  const url = new URL(calls[0].url);
  assertEquals(url.host, "abc.eu-west-1.aws.clickhouse.cloud:8443");
  assertEquals(url.searchParams.get("default_format"), "JSON");
});

/** Buffering server-side is what stops a partial body with an exception in it. */
Deno.test("run: always sets wait_end_of_query", async () => {
  const { ctx, calls } = mockCtx([jsonResult([])], D);
  await new QueryClient(ctx).run("SELECT 1");
  assertEquals(new URL(calls[0].url).searchParams.get("wait_end_of_query"), "1");
});

/** The auth hook signs; the client must never carry a credential. */
Deno.test("run: never sets an authorization header", async () => {
  const { ctx, calls } = mockCtx([jsonResult([])], D);
  await new QueryClient(ctx).run("SELECT 1");
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** ClickHouse settings are query-string parameters on the HTTP interface. */
Deno.test("run: settings and the database go into the query string", async () => {
  const { ctx, calls } = mockCtx([jsonResult([])], D);
  await new QueryClient(ctx).run("SELECT 1", {
    database: "analytics",
    settings: { readonly: 1, max_execution_time: 30, param_since: "2026-08-01" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("database"), "analytics");
  assertEquals(url.searchParams.get("readonly"), "1");
  assertEquals(url.searchParams.get("max_execution_time"), "30");
  assertEquals(url.searchParams.get("param_since"), "2026-08-01");
});

/** meta carries the declared type, which is how a caller knows a string. */
Deno.test("run: returns rows with each column's declared ClickHouse type", async () => {
  const { ctx } = mockCtx([
    jsonResult([{ id: "18446744073709551615", name: "x" }], [
      { name: "id", type: "UInt64" },
      { name: "name", type: "String" },
    ]),
  ], D);
  const result = await new QueryClient(ctx).run("SELECT id, name FROM t");
  assertEquals(result.columns, [
    { name: "id", type: "UInt64" },
    { name: "name", type: "String" },
  ]);
  // A UInt64 arrives as a string because it does not fit a double.
  assertEquals(typeof result.rows[0].id, "string");
  assertEquals(result.rowCount, 1);
});

/** Every number in the summary is a string, for the same reason. */
Deno.test("parseSummary: converts the string counters, and elapsed to milliseconds", () => {
  const summary = parseSummary(JSON.stringify({
    read_rows: "1000000",
    read_bytes: "8000000",
    written_rows: "5",
    elapsed_ns: "1500000",
    memory_usage: "1147327",
  }));
  assertEquals(summary.readRows, 1_000_000);
  assertEquals(summary.readBytes, 8_000_000);
  assertEquals(summary.writtenRows, 5);
  assertEquals(summary.elapsedMs, 1.5);
  assertEquals(summary.memoryUsageBytes, 1_147_327);
});

Deno.test("parseSummary: a missing or unparseable header is an empty summary", () => {
  assertEquals(parseSummary(null), {});
  assertEquals(parseSummary("not json"), {});
});

Deno.test("run: surfaces the summary and the query id alongside the rows", async () => {
  const { ctx } = mockCtx([jsonResult([{ n: 1 }])], D);
  const result = await new QueryClient(ctx).run("SELECT 1");
  assertEquals(result.summary.readRows, 1_000_000);
  assertEquals(result.queryId, "q-1");
});

/** The body ends with the symbolic name; the code is also in a header. */
Deno.test("parseException: reads the code, the name and the message", () => {
  const body =
    "Code: 60. DB::Exception: Unknown table expression identifier 'nothing' in scope SELECT " +
    "nonsense FROM nothing. (UNKNOWN_TABLE) (version 26.8.1.1653 (official build))";
  const parsed = parseException(body, "60");
  assertEquals(parsed.code, 60);
  assertEquals(parsed.name, "UNKNOWN_TABLE");
  assert(/Unknown table expression identifier/.test(parsed.message), parsed.message);
  assertEquals(/version/.test(parsed.message), false, "the version suffix is trimmed");
});

/** The header is reliable even when the body is a partial result. */
Deno.test("parseException: the header code wins over the body", () => {
  assertEquals(parseException("partial data here", "395").code, 395);
  assertEquals(parseException("Code: 60. DB::Exception: x (UNKNOWN_TABLE)", null).code, 60);
});

/**
 * Measured against play.clickhouse.com: UNKNOWN_TABLE and UNKNOWN_IDENTIFIER
 * both map onto 404, which a generic client reads as a wrong URL.
 */
Deno.test("describeQueryError: a 404 says it is a SQL error, not a wrong URL", () => {
  const message = describeQueryError(
    404,
    "Code: 60. DB::Exception: Unknown table x. (UNKNOWN_TABLE)",
    "60",
  );
  assert(/UNKNOWN_TABLE \(60\)/.test(message), message);
  assert(/not a wrong URL/.test(message), message);
});

/** ACCESS_DENIED maps onto 403, which reads as a bad credential. */
Deno.test("describeQueryError: a 403 says it is a SQL error, not a bad credential", () => {
  const message = describeQueryError(
    403,
    "Code: 497. DB::Exception: not enough privileges. (ACCESS_DENIED)",
    "497",
  );
  assert(/not a bad credential/.test(message), message);
  assert(/not allowed to run this statement/.test(message), message);
});

Deno.test("describeQueryError: 400 is a syntax error and 401 is the database user", () => {
  assert(/syntax error, mapped onto 400/.test(
    describeQueryError(400, "Code: 62. DB::Exception: x (SYNTAX_ERROR)", "62"),
  ));
  const unauthorized = describeQueryError(401, "", null);
  assert(/service's own user, not the organisation API key/.test(unauthorized), unauthorized);
});

Deno.test("run: an error carries the explanation", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: "Code: 60. DB::Exception: Unknown table x. (UNKNOWN_TABLE)",
    headers: { "content-type": "text/plain", "x-clickhouse-exception-code": "60" },
  }], D);
  let message = "";
  try {
    await new QueryClient(ctx).run("SELECT * FROM x");
  } catch (err) {
    message = String(err);
  }
  assert(/UNKNOWN_TABLE/.test(message), message);
  assert(/not a wrong URL/.test(message), message);
});

/** Raw mode is for statements that return nothing, like an insert. */
Deno.test("run: raw mode skips the JSON format and returns no rows", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: "",
    headers: { "x-clickhouse-summary": JSON.stringify({ written_rows: "3" }) },
  }], D);
  const result = await new QueryClient(ctx).run("INSERT INTO t FORMAT JSONEachRow\n{}", {
    raw: true,
  });
  assertEquals(new URL(calls[0].url).searchParams.get("default_format"), null);
  assertEquals(result.rows, []);
  assertEquals(result.summary.writtenRows, 3);
});

/** The defence is wait_end_of_query, so seeing this at all is unexpected. */
Deno.test("run: an unparseable body explains the partial-response case", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: '{"data":[{"a":1}]\nCode: 395. DB::Exception' }],
    D,
  );
  let message = "";
  try {
    await new QueryClient(ctx).run("SELECT 1");
  } catch (err) {
    message = String(err);
  }
  assert(/partial data with an exception appended/.test(message), message);
  assert(/wait_end_of_query=1/.test(message), message);
});
