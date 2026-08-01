import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { OneSimpleApiClient } from "../../lib/client.ts";

Deno.test("client: always requests output=json", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  const client = new OneSimpleApiClient(ctx);
  await client.request("/qr_code", { query: { message: "hi" } });
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://onesimpleapi.com");
  assertEquals(url.pathname, "/api/qr_code");
  assertEquals(url.searchParams.get("output"), "json");
  assertEquals(url.searchParams.get("message"), "hi");
});

Deno.test("client: never sets the token query param itself", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  const client = new OneSimpleApiClient(ctx);
  await client.request("/qr_code", { query: { message: "hi" } });
  assertEquals(new URL(calls[0].url).searchParams.has("token"), false);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  const client = new OneSimpleApiClient(ctx);
  await client.request("/x", { query: { a: "kept", b: undefined, c: null, d: "" } });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: treats a non-JSON response as an error even on HTTP 200 (the invalid-token quirk)", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: "<!DOCTYPE html><title>Redirecting to /login</title>",
      headers: { "content-type": "text/html; charset=UTF-8" },
    },
  ]);
  const client = new OneSimpleApiClient(ctx);
  await assertRejects(
    () => client.request("/exchange_rate", { query: { to_currency: "USD" } }),
    Error,
    "did not return JSON",
  );
});

Deno.test("client: throws a descriptive Error on non-2xx JSON", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: { status: "error", message: "not found" } },
  ]);
  const client = new OneSimpleApiClient(ctx);
  const err = await assertRejects(
    () => client.request("/page_info"),
    Error,
    "404",
  );
  assertEquals(err.message.includes("/api/page_info"), true);
});

Deno.test("client: resolves on a 2xx JSON response and returns the parsed body", async () => {
  const body = { url: "https://cdn.opq.to/x.png", elapsed: 0.01 };
  const { ctx } = mockCtx([{ body }]);
  const client = new OneSimpleApiClient(ctx);
  const result = await client.request("/qr_code", { query: { message: "hi" } });
  assertEquals(result, body);
});
