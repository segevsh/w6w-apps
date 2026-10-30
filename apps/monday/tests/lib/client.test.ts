import { test } from "node:test";
import { assertEquals, assertRejects, assertThrows } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { compact, csv, jsonArg, MondayClient } from "../../lib/client.ts";

test("client: POSTs the GraphQL document to the single endpoint, no auth header", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { me: { id: "u1" } } } }]);
  const out = await new MondayClient(ctx).query("{ me { id } }");
  assertEquals(out, { me: { id: "u1" } });
  assertEquals(calls[0].url, "https://api.monday.com/v2");
  assertEquals(calls[0].method, "POST");
  // The client sets API-Version (transport metadata) but never Authorization.
  assertEquals(calls[0].headers["api-version"], "2024-10");
  assertEquals("authorization" in calls[0].headers, false);
});

test("client: drops unset variables so they don't reach monday as nulls", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await new MondayClient(ctx).query("query", { a: "kept", b: undefined, c: null, d: "" });
  assertEquals(JSON.parse(calls[0].body!).variables, { a: "kept" });
});

test("client: treats GraphQL errors as failures even on a 200", async () => {
  // Without this check a failed mutation looks like a success with an undefined result.
  const { ctx } = mockCtx([{ status: 200, body: { errors: [{ message: "Not found" }] } }]);
  await assertRejects(
    () => new MondayClient(ctx).query("query"),
    Error,
    "monday GraphQL error: Not found",
  );
});

test("client: joins multiple GraphQL errors", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "a" }, { message: "b" }] } }]);
  await assertRejects(() => new MondayClient(ctx).query("q"), Error, "a; b");
});

test("client: surfaces a non-JSON response", async () => {
  const { ctx } = mockCtx([{ status: 502, statusText: "Bad Gateway", body: "<html>" }]);
  await assertRejects(() => new MondayClient(ctx).query("q"), Error, "non-JSON response");
});

test("client: rejects a 200 with neither data nor errors", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  await assertRejects(() => new MondayClient(ctx).query("q"), Error, "returned no data");
});

test("compact: drops undefined, null and blank values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false }), { a: 1, e: false });
});

test("csv: splits, trims and drops blanks", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
});

test("jsonArg: validates then re-encodes JSON, and rejects garbage", () => {
  assertEquals(jsonArg('{"a": 1}'), '{"a":1}');
  assertEquals(jsonArg(undefined), undefined);
  assertEquals(jsonArg(""), undefined);
  assertThrows(() => jsonArg("{not json"), Error, "valid JSON");
});
