import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  BigQueryClient,
  compact,
  csv,
  decodeRow,
  decodeRows,
  json,
  resolveDataset,
  resolveProject,
} from "../../lib/client.ts";

const display = { projectId: "p1", datasetId: "d1" };

Deno.test("resolveProject / resolveDataset: the override wins, and neither is an error", () => {
  const conn = { display } as never;
  assertEquals(resolveProject(conn), "p1");
  assertEquals(resolveProject(conn, "other"), "other");
  assertEquals(resolveDataset(conn), "d1");
  assertEquals(resolveDataset(conn, "other"), "other");

  const bare = { display: {} } as never;
  assert(assertThrows(() => resolveProject(bare), Error).message.includes("projectId"));
  assert(assertThrows(() => resolveDataset(bare), Error).message.includes("dataset"));
});

Deno.test("compact / csv / json behave as the actions expect", () => {
  assertEquals(compact({ a: 1, b: undefined, c: "", d: false, e: [] }), { a: 1, d: false });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(json('{"a":1}', "labels"), { a: 1 });
  assert(assertThrows(() => json("{oops", "schema"), Error).message.includes("schema"));
});

/**
 * BigQuery's row encoding is the single most surprising thing about this API:
 * positional cells, every scalar a string.
 */
Deno.test("decodeRow: zips positional cells against the schema", () => {
  const fields = [{ name: "name", type: "STRING" }, { name: "count", type: "INTEGER" }];
  assertEquals(
    decodeRow(fields, { f: [{ v: "ada" }, { v: "36" }] }),
    { name: "ada", count: "36" },
  );
});

Deno.test("decodeRow: INT64 stays a string, because it does not fit a JSON number", () => {
  const fields = [{ name: "big", type: "INTEGER" }];
  const decoded = decodeRow(fields, { f: [{ v: "9223372036854775807" }] });
  // Coercing this to a number would silently lose precision.
  assertEquals(decoded.big, "9223372036854775807");
  assertEquals(typeof decoded.big, "string");
});

Deno.test("decodeRow: NULL becomes null, not undefined or an empty string", () => {
  assertEquals(decodeRow([{ name: "x", type: "STRING" }], { f: [{ v: null }] }), { x: null });
});

Deno.test("decodeRow: a REPEATED field becomes a plain array", () => {
  const fields = [{ name: "tags", type: "STRING", mode: "REPEATED" }];
  assertEquals(
    decodeRow(fields, { f: [{ v: [{ v: "a" }, { v: "b" }] }] }),
    { tags: ["a", "b"] },
  );
});

Deno.test("decodeRow: a RECORD becomes a nested object", () => {
  const fields = [{
    name: "user",
    type: "RECORD",
    fields: [{ name: "id", type: "STRING" }, { name: "age", type: "INTEGER" }],
  }];
  assertEquals(
    decodeRow(fields, { f: [{ v: { f: [{ v: "u1" }, { v: "7" }] } }] }),
    { user: { id: "u1", age: "7" } },
  );
});

Deno.test("decodeRows: returns undefined when there is no schema to zip against", () => {
  assertEquals(decodeRows(undefined, [{ f: [{ v: "x" }] }]), undefined);
  assertEquals(decodeRows({ fields: [{ name: "a" }] }, undefined), undefined);
});

Deno.test("client: builds paths under the discovery document's base", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await new BigQueryClient(ctx).request("/projects/p1/datasets");
  assertEquals(calls[0].url, `${API_URL}/projects/p1/datasets`);
  // The version lives in the path, not a header.
  assert(calls[0].url.includes("/bigquery/v2/"), calls[0].url);
});

Deno.test("client: never sends an Authorization header — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await new BigQueryClient(ctx).request("/projects/p1/datasets");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("client: a failure surfaces the status and Google's error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: {
      error: { code: 403, message: "Quota exceeded", errors: [{ reason: "quotaExceeded" }] },
    },
  }], { display });
  const err = await assertRejects(
    async () => await new BigQueryClient(ctx).request("/projects/p1/queries"),
    Error,
  );
  assert(err.message.includes("403"), err.message);
  assert(err.message.includes("quotaExceeded"), err.message);
});

Deno.test("client: requestAll follows nextPageToken until it is absent", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { datasets: [{ id: "1" }], nextPageToken: "t2" } },
    { status: 200, body: { datasets: [{ id: "2" }] } },
  ], { display });
  const items = await new BigQueryClient(ctx).requestAll("/projects/p1/datasets", "datasets");
  assertEquals(items, [{ id: "1" }, { id: "2" }]);
  assertEquals(new URL(calls[1].url).searchParams.get("pageToken"), "t2");
});

Deno.test("client: requestAll stops at wantTotal even with a next page waiting", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { datasets: [{ id: "1" }, { id: "2" }, { id: "3" }], nextPageToken: "t" },
    },
  ], { display });
  assertEquals(
    await new BigQueryClient(ctx).requestAll("/projects/p1/datasets", "datasets", {}, 2),
    [{ id: "1" }, { id: "2" }],
  );
  assertEquals(calls.length, 1);
});
