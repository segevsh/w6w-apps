import { assertEquals, assertRejects } from "@std/assert";
import { compact, describeError, ShortClient, stripPassword } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("describeError: reads message, then error, then the fallback", () => {
  assertEquals(
    describeError({ statusCode: 401, error: "Unauthorized", message: "No key" }, "f"),
    "No key",
  );
  assertEquals(describeError({ error: "Unauthorized" }, "f"), "Unauthorized");
  assertEquals(describeError(null, "f"), "f");
});

Deno.test("compact: drops undefined, null and empty strings but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0 }), { d: false, e: 0 });
});

Deno.test("stripPassword: removes only the password member", () => {
  assertEquals(stripPassword<Record<string, unknown>>({ a: 1, password: "x" }), { a: 1 });
});

Deno.test("client: sends no Authorization header and skips empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: 1 } }]);
  await new ShortClient(ctx).request("/x", { query: { a: "1", b: "", c: undefined } });
  assertEquals(calls[0].url, "https://api.short.io/x?a=1");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: a non-JSON error body falls back to the status text", async () => {
  const { ctx } = mockCtx([{ status: 502, statusText: "Bad Gateway", body: "" }]);
  await assertRejects(() => new ShortClient(ctx).request("/x"), Error, "Bad Gateway");
});
