import { test } from "node:test";
import { assert, assertEquals, assertRejects, assertThrows } from "../_assert.ts";
import { API_BASE, compact, parseJsonParam, request } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

test("API_BASE: fixed host, no region split", () => {
  assertEquals(API_BASE, "https://api.getvero.com/api/v2");
});

test("parseJsonParam: passes an already-parsed object through", () => {
  assertEquals(parseJsonParam({ a: 1 }), { a: 1 });
});

test("parseJsonParam: parses a JSON string", () => {
  assertEquals(parseJsonParam('{"a":1}'), { a: 1 });
});

test("parseJsonParam: undefined/null/empty-string are absent", () => {
  assertEquals(parseJsonParam(undefined), undefined);
  assertEquals(parseJsonParam(null), undefined);
  assertEquals(parseJsonParam(""), undefined);
});

test("parseJsonParam: rejects a non-object JSON value", () => {
  assertThrows(() => parseJsonParam("42"), Error, "expected a JSON object");
});

test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: "x", b: undefined, c: null, d: "", e: 0, f: false }), {
    a: "x",
    e: 0,
    f: false,
  });
});

test("request: POST sends JSON content-type and returns success + message", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 200, message: "Success." } }]);
  const result = await request(ctx, "POST", "/users/track", { id: "u1" });
  assertEquals(calls[0].url, "https://api.getvero.com/api/v2/users/track");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { id: "u1" });
  assertEquals(result, { success: true, message: "Success." });
});

test("request: PUT reaches the given path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 200, message: "Success." } }]);
  await request(ctx, "PUT", "/users/reidentify", { id: "u1", new_id: "u2" });
  assertEquals(calls[0].url, "https://api.getvero.com/api/v2/users/reidentify");
  assertEquals(calls[0].method, "PUT");
});

test("request: a non-2xx response reads Vero's own message", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: {
        status: 401,
        message: "Invalid authentication: You must provide a valid auth_token to access " +
          "this resource.",
      },
    },
  ]);
  const err = await assertRejects(
    async () => await request(ctx, "POST", "/users/track", { id: "u1" }),
    Error,
    "Vero 401",
  );
  assert(err.message.includes("Invalid authentication"));
});

test("request: falls back to raw text when the body isn't JSON", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: "upstream error",
    headers: { "content-type": "text/plain" },
  }]);
  const err = await assertRejects(
    async () => await request(ctx, "POST", "/users/track", { id: "u1" }),
    Error,
  );
  assert((err as Error).message.includes("upstream error"));
});
