import { test } from "node:test";
import { assert, assertEquals, assertThrows } from "../_assert.ts";
import {
  asJson,
  asOptionalJson,
  assertIfMatch,
  assertStashToken,
  compact,
  formatGlideError,
  GlideClient,
} from "../../lib/client.ts";
import { envelope, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("compact: drops undefined/null/empty, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

test("asJson: parses a JSON string and passes through a non-string", () => {
  assertEquals(asJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asJson([1, 2], "x"), [1, 2]);
});

test("asJson: throws on missing or invalid JSON", () => {
  assertThrows(() => asJson(undefined, "Rows"), Error, "Rows is required");
  assertThrows(() => asJson("{not json", "Rows"), Error, "not valid JSON");
});

test("asOptionalJson: undefined stays undefined, no error", () => {
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
});

test("assertStashToken: accepts the documented grammar", () => {
  assertEquals(assertStashToken("20240215-job32", "Stash ID"), "20240215-job32");
  assertEquals(assertStashToken("1", "Serial"), "1");
});

test("assertStashToken: rejects a leading dash and other illegal characters", () => {
  assertThrows(() => assertStashToken("-INVALID-", "Stash ID"), Error, "invalid");
  assertThrows(() => assertStashToken("has space", "Stash ID"), Error, "invalid");
});

test("assertIfMatch: requires the quoted-integer ETag shape", () => {
  assertEquals(assertIfMatch('"42"'), '"42"');
  assertThrows(() => assertIfMatch("42"), Error, "including the double quotes");
  assertThrows(() => assertIfMatch('"abc"'), Error, "invalid");
});

test("formatGlideError: renders the documented {error:{type,message}} body", () => {
  const msg = formatGlideError(
    404,
    "GET",
    "/tables",
    JSON.stringify(errorBody(
      "request_error",
      "API key not found, or duplicate IN****ID",
    )),
  );
  assert(msg.includes("request_error"));
  assert(msg.includes("API key not found"));
  assert(msg.includes("404"));
});

test("formatGlideError: falls back to raw text when the body isn't the error shape", () => {
  const msg = formatGlideError(500, "GET", "/tables", "upstream exploded");
  assert(msg.includes("upstream exploded"));
});

test("GlideClient.data: unwraps the data envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: "t1", name: "Invoices" }]) }]);
  const data = await new GlideClient(ctx).data("/tables");
  assertEquals(data, [{ id: "t1", name: "Invoices" }]);
  assertEquals(pathOf(calls[0].url), "/tables");
});

test("GlideClient.json: leaves the body intact for a sibling key like continuation", async () => {
  const { ctx } = mockCtx([{ body: { data: [{ a: 1 }], continuation: "tok" } }]);
  const body = await new GlideClient(ctx).json("/tables/t1/rows");
  assertEquals(body, { data: [{ a: 1 }], continuation: "tok" });
});

test("GlideClient: query params are set, and empty/undefined ones are dropped", async () => {
  const { calls, ctx } = mockCtx([{ body: envelope([]) }]);
  await new GlideClient(ctx).data("/tables/t1/rows", {
    query: { limit: 10, continuation: undefined, onSchemaError: "" },
  });
  assertEquals(queryOf(calls[0].url), { limit: "10" });
});

test("GlideClient: a non-2xx response throws with the formatted error", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody("request_error", "API key not found") },
  ]);
  try {
    await new GlideClient(ctx).data("/tables");
    throw new Error("expected a throw");
  } catch (e) {
    assert(e instanceof Error);
    assert(e.message.includes("request_error"));
  }
});

test("GlideClient: extra headers (e.g. if-match) are forwarded verbatim", async () => {
  const { calls, ctx } = mockCtx([{ body: {} }]);
  await new GlideClient(ctx).data("/tables/t1", {
    method: "PUT",
    headers: { "if-match": '"5"' },
    body: { rows: [] },
  });
  assertEquals(calls[0].headers["if-match"], '"5"');
  assertEquals(calls[0].method, "PUT");
});
