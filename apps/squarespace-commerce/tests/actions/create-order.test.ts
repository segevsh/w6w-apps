import { assert, assertEquals, assertThrows } from "@std/assert";
import createOrder from "../../actions/create-order.ts";
import {
  API_ROOT,
  bodyOf,
  errorBody,
  mockCtx,
  mockCtxWithInvocation,
  UUID_V4,
} from "../_helpers.ts";

const REQUIRED = {
  channelName: "Faire Wholesale",
  createdOn: "2026-09-22T15:58:07.187Z",
  externalOrderReference: "EXT-98765",
  fulfillments: [],
  grandTotal: { currency: "USD", value: 49.99 },
  lineItems: [{ lineItemType: "PHYSICAL_PRODUCT", quantity: 2, title: "Brine 32oz" }],
  priceTaxInterpretation: "EXCLUSIVE",
};

Deno.test("create-order: POST /1.0/commerce/orders with the seven required fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "O1", orderNumber: "1001" } }]);
  const out = await createOrder.execute!({ ...REQUIRED }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/1.0/commerce/orders`);
  assertEquals(calls[0].headers["content-type"], "application/json");
  const body = bodyOf(calls[0]);
  assertEquals(Object.keys(body).sort(), [
    "channelName",
    "createdOn",
    "externalOrderReference",
    "fulfillments",
    "grandTotal",
    "lineItems",
    "priceTaxInterpretation",
  ]);
  assertEquals(body.grandTotal, { currency: "USD", value: 49.99 });
  assertEquals(out.id, "O1");
});

Deno.test("create-order: a fresh Idempotency-Key is stamped, even with no invocation", async () => {
  const { ctx, calls } = mockCtxWithInvocation([
    { status: 201, body: { id: "O1" } },
    { status: 201, body: { id: "O1" } },
  ], "inv-abc123");
  await createOrder.execute!({ ...REQUIRED }, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-abc123");

  // The same key is what makes a runtime retry a replay rather than a duplicate.
  const plain = mockCtx([{ status: 201, body: { id: "O2" } }, { status: 201, body: { id: "O3" } }]);
  await createOrder.execute!({ ...REQUIRED }, plain.ctx);
  await createOrder.execute!({ ...REQUIRED }, plain.ctx);
  const first = plain.calls[0].headers["idempotency-key"];
  const second = plain.calls[1].headers["idempotency-key"];
  assert(UUID_V4.test(first), `not a v4 UUID: ${first}`);
  assert(UUID_V4.test(second), `not a v4 UUID: ${second}`);
  assert(first !== second, "two invocations must not share an idempotency key");
});

Deno.test("create-order: optional fields are omitted, not sent as null", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "O1" } }]);
  await createOrder.execute!(
    { ...REQUIRED, inventoryBehavior: "DEDUCT", customerEmail: "a@b.c" },
    ctx,
  );

  const body = bodyOf(calls[0]);
  assertEquals(body.inventoryBehavior, "DEDUCT");
  assertEquals(body.customerEmail, "a@b.c");
  assertEquals("billingAddress" in body, false);
  assertEquals("shippingTotal" in body, false);
});

Deno.test("create-order: JSON params accept the string a caller typed", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "O1" } }]);
  await createOrder.execute!({
    ...REQUIRED,
    lineItems: JSON.stringify(REQUIRED.lineItems),
    grandTotal: JSON.stringify(REQUIRED.grandTotal),
  }, ctx);

  const body = bodyOf(calls[0]);
  assertEquals(body.grandTotal, { currency: "USD", value: 49.99 });
  assertEquals(Array.isArray(body.lineItems), true);
});

Deno.test("create-order: empty lineItems are rejected before the call", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () => createOrder.execute!({ ...REQUIRED, lineItems: [] }, ctx),
    Error,
    "non-empty array",
  );
});

Deno.test("create-order: FULFILLED without fulfilledOn is rejected before the call", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () => createOrder.execute!({ ...REQUIRED, fulfillmentStatus: "FULFILLED" }, ctx),
    Error,
    "fulfilledOn is required",
  );
});

Deno.test("create-order: a 429 names the stricter Create order limit", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: errorBody("TOO_MANY_REQUESTS", { message: "Too many requests" }),
  }]);

  let message = "";
  try {
    await createOrder.execute!({ ...REQUIRED }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("TOO_MANY_REQUESTS"), true);
  assertEquals(message.includes("100/hour on Create order"), true);
});
