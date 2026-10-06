import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { bodyFailed, compact, formatError, seg, toList, TwoChatClient } from "../../lib/client.ts";

Deno.test("seg: keeps + and @ literal (2Chat's own examples) but encodes everything else", () => {
  assertEquals(seg("+595981048477"), "+595981048477");
  assertEquals(seg("WW-WPN1-5215511112222@c.us"), "WW-WPN1-5215511112222@c.us");
  assertEquals(seg("a/b?c"), "a%2Fb%3Fc");
});

Deno.test("seg: refuses an empty value", () => {
  try {
    seg("  ");
    throw new Error("should have thrown");
  } catch (e) {
    assert((e as Error).message.includes("empty"));
  }
});

Deno.test("toList: accepts arrays, commas and newlines; drops blanks", () => {
  assertEquals(toList("+1, +2\n+3,,"), ["+1", "+2", "+3"]);
  assertEquals(toList([" +1 ", ""]), ["+1"]);
  assertEquals(toList(undefined), []);
});

Deno.test("compact: drops undefined, null and empty string but keeps 0 and false", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: 0, f: false }), {
    a: 1,
    e: 0,
    f: false,
  });
});

Deno.test("formatError: reads the documented envelope, the gateway's detail, and validation lists", () => {
  assertEquals(
    formatError(422, { error: true, error_code: "WABA_WINDOW_CLOSED", error_message: "closed" }),
    "HTTP 422 (WABA_WINDOW_CLOSED): closed",
  );
  assertEquals(formatError(401, { detail: "Invalid API Key" }), "HTTP 401: Invalid API Key");
  assertEquals(
    formatError(422, { detail: [{ msg: "field required" }, { msg: "bad" }] }),
    "HTTP 422: field required; bad",
  );
  assertEquals(formatError(500, undefined), "HTTP 500");
});

Deno.test("bodyFailed: success:false and error:true are failures; check-number's bare body is not", () => {
  assertEquals(bodyFailed({ success: false }), true);
  assertEquals(bodyFailed({ error: true }), true);
  assertEquals(bodyFailed({ success: true }), false);
  assertEquals(bodyFailed({ is_valid: true } as never), false);
});

Deno.test("client: treats a 200 whose body says success:false as a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, error_message: "number is busy" } }]);
  const err = await assertRejects(() => new TwoChatClient(ctx).get("/users"), Error);
  assert(err.message.includes("number is busy"), err.message);
});

Deno.test("client: surfaces the gateway's detail on a 401 and never echoes the query", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Invalid API Key" } }]);
  const err = await assertRejects(
    () => new TwoChatClient(ctx).get("/contacts/search", { query: "secret-name" }),
    Error,
  );
  assert(err.message.includes("Invalid API Key"), err.message);
  assert(!err.message.includes("secret-name"), err.message);
});

Deno.test("client: a non-JSON failure body degrades to the bare status", async () => {
  const { ctx } = mockCtx([{ status: 504, body: "<html>gateway</html>", headers: {} }]);
  const err = await assertRejects(() => new TwoChatClient(ctx).get("/users"), Error);
  assert(err.message.endsWith("HTTP 504"), err.message);
});

Deno.test("client: sends no auth header and JSON-encodes a body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await new TwoChatClient(ctx).post("/contacts", { a: 1 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["x-user-api-key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
});
