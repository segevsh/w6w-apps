import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/query-run.ts";

const D = { display: { host: "https://mycompany.cloud.looker.com" } };
const base = { model: "ecommerce", explore: "orders", fields: "orders.count" };

Deno.test("query-run: posts the query and returns the rows", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ "orders.count": 7 }] }], D);
  const result = await action.execute(
    { ...base, fields: "orders.count, users.city", sorts: "orders.count desc", limit: 100 },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(new URL(calls[0].url).pathname, "/api/4.0/queries/run/json");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals(body.model, "ecommerce");
  assertEquals(body.fields, ["orders.count", "users.city"]);
  assertEquals(body.sorts, ["orders.count desc"]);
  assertEquals(result.rowCount, 1);
  assertEquals(result.format, "json");
});

/** Looker's spec documents `Query.view` as the Explore name. */
Deno.test("query-run: sends the Explore as `view`, which is what Looker calls it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], D);
  await action.execute(base, ctx);
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals(body.view, "orders");
  assertEquals("explore" in body, false);
});

/** The limit is a string in the body, and Looker's own type says so. */
Deno.test("query-run: the body limit is a string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], D);
  await action.execute({ ...base, limit: 250 }, ctx);
  assertEquals((JSON.parse(calls[0].body!) as Record<string, unknown>).limit, "250");
});

/** -1 is a scan of the whole Explore, on somebody else's warehouse bill. */
Deno.test("query-run: refuses Looker's unlimited -1, and says why", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ ...base, limit: -1 }, ctx),
    Error,
  );
  assert(/positive number of rows/.test(err.message), err.message);
  assert(/whole Explore with no ceiling/.test(err.message), err.message);
  assertEquals(calls.length, 0, "it must not reach the warehouse to find out");
});

Deno.test("query-run: refuses a zero limit too", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(async () => await action.execute({ ...base, limit: 0 }, ctx), Error);
});

/** A bare field name is rejected in terms that read as a missing field. */
Deno.test("query-run: refuses unqualified field names before sending", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ ...base, fields: "count" }, ctx),
    Error,
  );
  assert(/view_name\.field_name/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("query-run: requires a model, an Explore and at least one field", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ ...base, model: "" }, ctx),
    Error,
    "model",
  );
  const err = await assertRejects(
    async () => await action.execute({ ...base, explore: "" }, ctx),
    Error,
  );
  assert(/not the LookML view/.test(err.message), err.message);
  await assertRejects(
    async () => await action.execute({ ...base, fields: "" }, ctx),
    Error,
    "at least one field",
  );
});

/** Cache off means every run is a fresh warehouse query. */
Deno.test("query-run: cache is on by default and passed through when turned off", async () => {
  const on = mockCtx([{ status: 200, body: [] }], D);
  await action.execute(base, on.ctx);
  assertEquals(new URL(on.calls[0].url).searchParams.get("cache"), "true");

  const off = mockCtx([{ status: 200, body: [] }], D);
  await action.execute({ ...base, cache: false }, off.ctx);
  assertEquals(new URL(off.calls[0].url).searchParams.get("cache"), "false");
});

/** Only json_detail carries the generated SQL. */
Deno.test("query-run: json_detail returns the rows and the SQL", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: [{ a: 1 }, { a: 2 }], sql: "SELECT 1" },
  }], D);
  const result = await action.execute({ ...base, format: "json_detail" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.rowCount, 2);
  assertEquals(result.sql, "SELECT 1");
});

Deno.test("query-run: csv comes back verbatim rather than parsed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "a,b\n1,2" }], D);
  const result = await action.execute({ ...base, format: "csv" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/4.0/queries/run/csv");
  assertEquals(result.raw, "a,b\n1,2");
  assertEquals(result.rows, []);
});

/** A result exactly at the limit is probably truncated. */
Deno.test("query-run: reports hitting the limit", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ a: 1 }, { a: 2 }] }], D);
  const result = await action.execute({ ...base, limit: 2 }, ctx) as Record<string, unknown>;
  assertEquals(result.hitLimit, true);
});

/** Rows are business data; the log records counts. */
Deno.test("query-run: logs the shape and never the rows", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: [{ salary: 90000 }] }], D);
  await action.execute(base, ctx);
  const data = JSON.stringify(logs[0]?.data ?? {});
  assert(/rowCount/.test(data), data);
  assert(!/salary|90000/.test(data), data);
});

Deno.test("query-run: filters are parsed from JSON and empty ones are dropped", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], D);
  await action.execute({ ...base, filters: '{"orders.created_date":"last 7 days"}' }, ctx);
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals(body.filters, { "orders.created_date": "last 7 days" });

  const bare = mockCtx([{ status: 200, body: [] }], D);
  await action.execute(base, bare.ctx);
  assertEquals("filters" in (JSON.parse(bare.calls[0].body!) as object), false);
});
