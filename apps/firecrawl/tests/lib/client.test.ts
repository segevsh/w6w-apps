import { assertEquals, assertRejects } from "@std/assert";
import { compact, FirecrawlClient, formatFirecrawlError, truncate } from "../../lib/client.ts";
import { envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("compact: drops undefined and null but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: false, d: 0, e: "x" }), {
    c: false,
    d: 0,
    e: "x",
  });
});

Deno.test("truncate: passes short strings through unchanged", () => {
  assertEquals(truncate("short"), "short");
});

Deno.test("truncate: caps long strings and says how much was cut", () => {
  const long = "x".repeat(1000);
  const out = truncate(long, 10);
  assertEquals(out.startsWith("xxxxxxxxxx"), true);
  assertEquals(out.includes("990 chars truncated"), true);
});

Deno.test("formatFirecrawlError: flattens a validation error's details array", () => {
  const raw = JSON.stringify({
    success: false,
    code: "BAD_REQUEST",
    error: "Bad Request",
    details: [{ path: ["url"], message: "Invalid input: expected string, received undefined" }],
  });
  const msg = formatFirecrawlError(400, "POST", "/scrape", raw);
  assertEquals(msg.includes("BAD_REQUEST"), true);
  assertEquals(msg.includes("url: Invalid input"), true);
});

Deno.test("formatFirecrawlError: appends a retry note for 429", () => {
  const raw = JSON.stringify({ success: false, error: "Request rate limit exceeded." });
  const msg = formatFirecrawlError(429, "POST", "/scrape", raw);
  assertEquals(msg.includes("retry with backoff"), true);
});

Deno.test("formatFirecrawlError: falls back to the raw body when it is not the documented shape", () => {
  const msg = formatFirecrawlError(500, "GET", "/x", "<html>oops</html>");
  assertEquals(msg.includes("<html>oops</html>"), true);
});

Deno.test("FirecrawlClient.data: unwraps the {success, data} envelope", async () => {
  const { ctx } = mockCtx([{ status: 200, body: envelope({ markdown: "hello" }) }]);
  const out = await new FirecrawlClient(ctx).data("/scrape", { method: "POST", body: {} });
  assertEquals(out, { markdown: "hello" });
});

Deno.test("FirecrawlClient.json: does not unwrap — returns the body as-is", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "j1", url: "https://x/v2/crawl/j1" } }]);
  const out = await new FirecrawlClient(ctx).json("/crawl", { method: "POST", body: {} });
  assertEquals(out, { id: "j1", url: "https://x/v2/crawl/j1" });
});

Deno.test("FirecrawlClient: a non-2xx status throws a formatted error", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthorized: Invalid token") }]);
  await assertRejects(
    () => new FirecrawlClient(ctx).json("/team/credit-usage"),
    Error,
    "Unauthorized: Invalid token",
  );
});

/**
 * The load-bearing case: Firecrawl answers a page-level scrape failure with
 * HTTP 200 and `success: false`. Checking only `res.ok` would silently treat
 * this as success.
 */
Deno.test("FirecrawlClient: a 200 response with success:false still throws", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: errorBody('DNS resolution failed for hostname "x".', {
      code: "SCRAPE_DNS_RESOLUTION_ERROR",
    }),
  }]);
  await assertRejects(
    () => new FirecrawlClient(ctx).data("/scrape", { method: "POST", body: {} }),
    Error,
    "SCRAPE_DNS_RESOLUTION_ERROR",
  );
});

Deno.test("FirecrawlClient: builds the request against the v2 origin", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({}) }]);
  await new FirecrawlClient(ctx).data("/scrape", {
    method: "POST",
    body: { url: "https://a.example" },
  });
  assertEquals(calls[0].url, "https://api.firecrawl.dev/v2/scrape");
  assertEquals(pathOf(calls[0].url), "/v2/scrape");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { url: "https://a.example" });
});
