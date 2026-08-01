import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, BitlyClient } from "../../lib/client.ts";

Deno.test("client: builds the URL against API_URL and drops empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new BitlyClient(ctx);
  await client.request("/user", { query: { a: "1", b: undefined, c: "" } });
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API_URL}/user`);
  assertEquals(url.searchParams.get("a"), "1");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
});

Deno.test("client: JSON-encodes a body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { id: "1" } }]);
  const client = new BitlyClient(ctx);
  await client.request("/bitlinks", { method: "POST", body: { long_url: "https://a.com" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { long_url: "https://a.com" });
});

Deno.test("client: returns undefined on a 204", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const client = new BitlyClient(ctx);
  const out = await client.request("/bitlinks/x");
  assertEquals(out, undefined);
});

Deno.test("client: throws on a non-ok response, with status and body in the message", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { message: "RATE_LIMIT_EXCEEDED" } }]);
  const client = new BitlyClient(ctx);
  await assertRejects(
    () => client.request("/bitlinks"),
    Error,
    "429",
  );
});
