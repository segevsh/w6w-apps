import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx, rejects } from "../_helpers.ts";
import { bodyFailed, compact, formatError, seg, toList, TwoChatClient } from "../../lib/client.ts";

test("seg: keeps + and @ literal (2Chat's own examples) but encodes everything else", () => {
  assert.deepStrictEqual(seg("+595981048477"), "+595981048477");
  assert.deepStrictEqual(seg("WW-WPN1-5215511112222@c.us"), "WW-WPN1-5215511112222@c.us");
  assert.deepStrictEqual(seg("a/b?c"), "a%2Fb%3Fc");
});

test("seg: refuses an empty value", () => {
  try {
    seg("  ");
    throw new Error("should have thrown");
  } catch (e) {
    assert.ok((e as Error).message.includes("empty"));
  }
});

test("toList: accepts arrays, commas and newlines; drops blanks", () => {
  assert.deepStrictEqual(toList("+1, +2\n+3,,"), ["+1", "+2", "+3"]);
  assert.deepStrictEqual(toList([" +1 ", ""]), ["+1"]);
  assert.deepStrictEqual(toList(undefined), []);
});

test("compact: drops undefined, null and empty string but keeps 0 and false", () => {
  assert.deepStrictEqual(compact({ a: 1, b: undefined, c: null, d: "", e: 0, f: false }), {
    a: 1,
    e: 0,
    f: false,
  });
});

test("formatError: reads the documented envelope, the gateway's detail, and validation lists", () => {
  assert.deepStrictEqual(
    formatError(422, { error: true, error_code: "WABA_WINDOW_CLOSED", error_message: "closed" }),
    "HTTP 422 (WABA_WINDOW_CLOSED): closed",
  );
  assert.deepStrictEqual(formatError(401, { detail: "Invalid API Key" }), "HTTP 401: Invalid API Key");
  assert.deepStrictEqual(
    formatError(422, { detail: [{ msg: "field required" }, { msg: "bad" }] }),
    "HTTP 422: field required; bad",
  );
  assert.deepStrictEqual(formatError(500, undefined), "HTTP 500");
});

test("bodyFailed: success:false and error:true are failures; check-number's bare body is not", () => {
  assert.deepStrictEqual(bodyFailed({ success: false }), true);
  assert.deepStrictEqual(bodyFailed({ error: true }), true);
  assert.deepStrictEqual(bodyFailed({ success: true }), false);
  assert.deepStrictEqual(bodyFailed({ is_valid: true } as never), false);
});

test("client: treats a 200 whose body says success:false as a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, error_message: "number is busy" } }]);
  const err = await rejects(() => new TwoChatClient(ctx).get("/users"));
  assert.ok(err.message.includes("number is busy"), err.message);
});

test("client: surfaces the gateway's detail on a 401 and never echoes the query", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Invalid API Key" } }]);
  const err = await rejects(
    () => new TwoChatClient(ctx).get("/contacts/search", { query: "secret-name" }),
  );
  assert.ok(err.message.includes("Invalid API Key"), err.message);
  assert.ok(!err.message.includes("secret-name"), err.message);
});

test("client: a non-JSON failure body degrades to the bare status", async () => {
  const { ctx } = mockCtx([{ status: 504, body: "<html>gateway</html>", headers: {} }]);
  const err = await rejects(() => new TwoChatClient(ctx).get("/users"));
  assert.ok(err.message.endsWith("HTTP 504"), err.message);
});

test("client: sends no auth header and JSON-encodes a body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await new TwoChatClient(ctx).post("/contacts", { a: 1 });
  assert.deepStrictEqual(calls[0].headers["content-type"], "application/json");
  assert.deepStrictEqual(calls[0].headers["x-user-api-key"], undefined);
  assert.deepStrictEqual(calls[0].headers["authorization"], undefined);
});
