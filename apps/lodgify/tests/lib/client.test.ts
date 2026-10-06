import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  asJson,
  asNumber,
  asText,
  compact,
  failureMessage,
  LodgifyClient,
  segment,
} from "../../lib/client.ts";

Deno.test("helpers: compact keeps false and 0 but drops unset values", () => {
  assertEquals(compact({ a: 0, b: false, c: undefined, d: null, e: "" }), { a: 0, b: false });
});

Deno.test("helpers: coercions", () => {
  assertEquals(asNumber("12"), 12);
  assertEquals(asNumber(""), undefined);
  assertEquals(asNumber("x"), undefined);
  assertEquals(asText("  hi "), "hi");
  assertEquals(asText("   "), undefined);
  assertEquals(segment("a/b?c"), "a%2Fb%3Fc");
  assertEquals(asJson<number[]>("[1]", "x"), [1]);
});

Deno.test("failureMessage: reads the documented error object", () => {
  assertEquals(failureMessage({ message: "nope", code: 999 }), "nope (code 999)");
  assertEquals(failureMessage({ message: "nope" }), "nope");
  assertEquals(failureMessage([1]), undefined);
  assertEquals(failureMessage(null), undefined);
});

Deno.test("client: sends accept, adds content-type only with a body, targets api.lodgify.com", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new LodgifyClient(ctx);
  await client.request("/v2/properties");
  await client.request("/v1/x", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[1].headers["content-type"], "application/json");
  assertEquals(calls[0].url, "https://api.lodgify.com/v2/properties");
});

Deno.test("client: a non-JSON error body is reported verbatim and truncated", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "x".repeat(1000), headers: {} }]);
  await assertRejects(
    () => new LodgifyClient(ctx).request("/v2/properties"),
    Error,
    "Lodgify 502 for GET /v2/properties",
  );
});

Deno.test("client.command / created: shapes for empty and bare-integer bodies", async () => {
  const { ctx } = mockCtx([{ body: undefined }, { body: { extra: 1 } }, { body: 5 }, { body: {} }]);
  const client = new LodgifyClient(ctx);
  assertEquals(await client.command("/a"), { ok: true });
  assertEquals(await client.command("/b"), { ok: true, extra: 1 });
  assertEquals(await client.created("/c"), { id: 5 });
  assertEquals(await client.created("/d"), { id: null });
});
