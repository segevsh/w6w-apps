import { assertEquals } from "@std/assert";
import {
  API_BASE,
  API_PREFIX,
  compact,
  encodeId,
  formatThriveCartError,
  ThriveCartClient,
  truncate,
} from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("client: base host and prefix are the ones observed live", () => {
  assertEquals(API_BASE, "https://thrivecart.com");
  assertEquals(API_PREFIX, "/api/external");
});

Deno.test("client: get() sends GET with query params and returns the parsed body", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ product_id: "1" }] }]);
  const out = await new ThriveCartClient(ctx).get("/products", { query: { affiliate_id: "x" } });
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/products");
  assertEquals(new URL(calls[0].url).searchParams.get("affiliate_id"), "x");
  assertEquals(out, [{ product_id: "1" }]);
});

Deno.test("client: get() drops empty/undefined query params", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new ThriveCartClient(ctx).get("/products", { query: { a: "", b: undefined, c: "x" } });
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.has("a"), false);
  assertEquals(params.has("b"), false);
  assertEquals(params.get("c"), "x");
});

Deno.test("client: post() with form encodes application/x-www-form-urlencoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await new ThriveCartClient(ctx).post("/customer", { form: { email: "a@b.com" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "email=a%40b.com");
});

Deno.test("client: post() form encodes an array value as repeated key[] entries", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await new ThriveCartClient(ctx).post("/affiliates", { form: { product_ids: ["1", "2"] } });
  assertEquals(calls[0].body, "product_ids%5B%5D=1&product_ids%5B%5D=2");
});

Deno.test("client: post() form drops undefined/null/empty-string fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new ThriveCartClient(ctx).post("/cancelSubscription", {
    form: { order_id: "1", subscription_id: undefined, note: "" },
  });
  assertEquals(calls[0].body, "order_id=1");
});

Deno.test("client: post() with json encodes application/json", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { subscription_id: 1 } }]);
  await new ThriveCartClient(ctx).post("/subscribe", {
    json: { event: "*", target_url: "https://example.com/hook" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(
    JSON.parse(calls[0].body!),
    { event: "*", target_url: "https://example.com/hook" },
  );
});

Deno.test("client: mode is sent as X-TC-Mode only when set", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }, { body: [] }]);
  await new ThriveCartClient(ctx).get("/products", { mode: "test" });
  await new ThriveCartClient(ctx).get("/products");
  assertEquals(calls[0].headers["x-tc-mode"], "test");
  assertEquals("x-tc-mode" in calls[1].headers, false);
});

Deno.test("client: a non-JSON error body still throws with the raw text", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "<html>oops</html>" }]);
  await new ThriveCartClient(ctx).get("/products").catch((err) => {
    assertEquals(err.message.includes("<html>oops</html>"), true, err.message);
  });
});

Deno.test("client: an error response throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody("The requested bump cannot be identified.") },
  ]);
  let threw = false;
  try {
    await new ThriveCartClient(ctx).get("/bumps/999");
  } catch (err) {
    threw = true;
    assertEquals(
      (err as Error).message.includes("The requested bump cannot be identified."),
      true,
      (err as Error).message,
    );
  }
  assertEquals(threw, true);
});

Deno.test("formatThriveCartError: includes error_description when present", () => {
  const msg = formatThriveCartError(
    401,
    "GET",
    "/ping",
    JSON.stringify(errorBody("invalid_token", "The access token provided is invalid")),
  );
  assertEquals(msg.includes("invalid_token"), true, msg);
  assertEquals(msg.includes("The access token provided is invalid"), true, msg);
});

Deno.test("formatThriveCartError: a bare english-sentence error is not mangled", () => {
  const msg = formatThriveCartError(
    400,
    "POST",
    "/cancelSubscription",
    JSON.stringify(errorBody("You must provide a valid order ID.")),
  );
  assertEquals(msg.includes("You must provide a valid order ID."), true, msg);
});

Deno.test("compact: drops undefined/null/empty-string but keeps false and 0", () => {
  const out = compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" });
  assertEquals(out, { d: false, e: 0, f: "x" });
});

Deno.test("truncate: leaves short text alone and truncates long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(700);
  const out = truncate(long, 600);
  assertEquals(out.startsWith("x".repeat(600)), true);
  assertEquals(out.includes("700 bytes truncated"), true, out);
});

Deno.test("encodeId: escapes a slash so it cannot escape the path segment", () => {
  assertEquals(encodeId("1/../../products"), "1%2F..%2F..%2Fproducts");
});
