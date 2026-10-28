import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/look-run.ts";

const D = { display: { host: "https://mycompany.cloud.looker.com" } };
const meta = {
  status: 200,
  body: { title: "Weekly revenue", updated_at: "2026-08-01T00:00:00Z" },
};

/** The definition can change under a workflow, so its timestamp comes back. */
Deno.test("look-run: fetches the definition, runs it, and returns updated_at", async () => {
  const { ctx, calls } = mockCtx([meta, { status: 200, body: [{ "orders.count": 7 }] }], D);
  const result = await action.execute({ lookId: "1" }, ctx) as Record<string, unknown>;

  assertEquals(new URL(calls[0].url).pathname, "/api/4.0/looks/1");
  assertEquals(new URL(calls[0].url).searchParams.get("fields"), "title,updated_at");
  assertEquals(new URL(calls[1].url).pathname, "/api/4.0/looks/1/run/json");
  assertEquals(calls[1].method, "GET");
  assertEquals(result.rowCount, 1);
  assertEquals(result.title, "Weekly revenue");
  assertEquals(result.updatedAt, "2026-08-01T00:00:00Z");
});

/** A Look saved without a limit runs unbounded; this is what caps it. */
Deno.test("look-run: sends a limit that overrides whatever the Look was saved with", async () => {
  const { ctx, calls } = mockCtx([meta, { status: 200, body: [] }], D);
  await action.execute({ lookId: "1", limit: 25 }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("limit"), "25");
});

Deno.test("look-run: refuses a non-positive limit, naming the unbounded case", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ lookId: "1", limit: -1 }, ctx),
    Error,
  );
  assert(/runs unbounded against the warehouse/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("look-run: requires an id", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`lookId` is required");
});

Deno.test("look-run: json_detail returns the SQL as well as the rows", async () => {
  const { ctx } = mockCtx([meta, {
    status: 200,
    body: { data: [{ a: 1 }], sql: "SELECT 1" },
  }], D);
  const result = await action.execute({ lookId: "1", format: "json_detail" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.sql, "SELECT 1");
  assertEquals(result.rowCount, 1);
});

Deno.test("look-run: csv comes back verbatim", async () => {
  const { ctx, calls } = mockCtx([meta, { status: 200, body: "a,b\n1,2" }], D);
  const result = await action.execute({ lookId: "1", format: "csv" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(new URL(calls[1].url).pathname, "/api/4.0/looks/1/run/csv");
  assertEquals(result.raw, "a,b\n1,2");
});

/** Rows are business data. */
Deno.test("look-run: logs the count and never the rows", async () => {
  const { ctx, logs } = mockCtx([meta, { status: 200, body: [{ salary: 90000 }] }], D);
  await action.execute({ lookId: "1" }, ctx);
  const data = JSON.stringify(logs.at(-1)?.data ?? {});
  assert(/rowCount/.test(data), data);
  assert(!/salary|90000/.test(data), data);
});

/** The shape this app recommends: an analyst owns the query, the workflow runs it. */
Deno.test("look-run: says a Look is a saved query rather than a saved result", () => {
  assert(/saved QUERY, not a saved result/.test(action.description!), action.description);
  assertEquals(action.type, "read");
});
