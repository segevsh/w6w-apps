import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { compact, compactBody, formatTremendousError, TremendousClient } from "../../lib/client.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("compact: drops undefined/null/empty-string values, keeps others", () => {
  assertEquals(compact({ a: "x", b: undefined, c: null, d: "", e: 0, f: false }), {
    a: "x",
    e: "0",
    f: "false",
  });
});

test("compactBody: drops unset keys without stringifying survivors", () => {
  assertEquals(compactBody({ denomination: 10, currency_code: undefined }), { denomination: 10 });
});

test("formatTremendousError: reports message and flattened nested payload", () => {
  const raw = JSON.stringify({
    errors: {
      message: "Order failed: validation failure",
      payload: { payment: { funding_source_id: "is required" } },
    },
  });
  const msg = formatTremendousError(400, "POST", "/orders", raw);
  assertEquals(
    msg,
    "Tremendous 400 for POST /orders: Order failed: validation failure " +
      "(payment.funding_source_id: is required)",
  );
});

test("formatTremendousError: falls back to the raw body when it isn't the documented shape", () => {
  const msg = formatTremendousError(500, "GET", "/orders/X", "internal server error");
  assertEquals(msg, "Tremendous 500 for GET /orders/X: internal server error");
});

test("TremendousClient.json: parses the body and throws on a non-2xx status", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { ok: true } }]);
  const body = await new TremendousClient(ctx).json("/ping");
  assertEquals(body, { ok: true });

  const { ctx: errCtx } = mockCtx([{
    status: 401,
    body: { errors: { message: "We did not receive an API key with this request." } },
  }]);
  await assertRejects(() => new TremendousClient(errCtx).json("/orders"));
});

test("TremendousClient.request: reports the status code alongside the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { order: { id: "X" } } }]);
  const { status, body } = await new TremendousClient(ctx).request<{ order: { id: string } }>(
    "/orders",
    { method: "POST", body: { external_id: "dup" } },
  );

  assertEquals(status, 201);
  assertEquals(body.order.id, "X");
  assertEquals(pathOf(calls[0].url), "/api/v2/orders");
  assertEquals(calls[0].headers["content-type"], "application/json");
});

test("TremendousClient: builds the URL from API_BASE + API_PREFIX + path + query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { orders: [], total_count: 0 } }]);
  await new TremendousClient(ctx).json("/orders", { query: { limit: 5 } });
  assertEquals(calls[0].url, "https://api.tremendous.com/api/v2/orders?limit=5");
});
