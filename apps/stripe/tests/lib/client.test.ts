import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { encodeForm, metadata, StripeClient, unset } from "../../lib/client.ts";

Deno.test("encodeForm: flattens nesting into Stripe's bracket syntax", () => {
  assertEquals(encodeForm({ metadata: { plan: "pro" } }), ["metadata%5Bplan%5D=pro"]);
  assertEquals(encodeForm({ expand: ["customer"] }), ["expand%5B0%5D=customer"]);
  assertEquals(
    encodeForm({ items: [{ price: "p1", quantity: 2 }] }),
    ["items%5B0%5D%5Bprice%5D=p1", "items%5B0%5D%5Bquantity%5D=2"],
  );
});

Deno.test("encodeForm: drops undefined but keeps null as the empty value that unsets a field", () => {
  assertEquals(encodeForm({ a: undefined, b: null, c: 0, d: false }), ["b=", "c=0", "d=false"]);
});

Deno.test("client: form-encodes writes — Stripe does not take JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cus_1" } }]);
  await new StripeClient(ctx).request("/customers", { form: { email: "a@b.test" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "email=a%40b.test");
});

Deno.test("client: pins the Stripe API version and sets no Authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new StripeClient(ctx).request("/balance");
  assertEquals(calls[0].headers["stripe-version"], "2024-06-20");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: sends the invocation id as Stripe's Idempotency-Key on writes", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  // The runtime supplies `invocation`; a retried invocation reuses the id, so
  // Stripe replays the first response instead of charging twice.
  (ctx as { invocation?: unknown }).invocation = { invocationId: "inv-42" };
  await new StripeClient(ctx).request("/refunds", { form: { charge: "ch_1" } });
  assertEquals(calls[0].headers["idempotency-key"], "inv-42");
});

Deno.test("client: does not send an Idempotency-Key on reads", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  (ctx as { invocation?: unknown }).invocation = { invocationId: "inv-42" };
  await new StripeClient(ctx).request("/balance");
  assertEquals("idempotency-key" in calls[0].headers, false);
});

Deno.test("client: surfaces Stripe's message and the offending param", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: '{"error":{"message":"Amount must be at least 50 cents","param":"amount"}}',
  }]);
  await assertRejects(
    () => new StripeClient(ctx).request("/charges", { form: {} }),
    Error,
    "Amount must be at least 50 cents (param: amount)",
  );
});

Deno.test("metadata: parses a JSON string, passes an object, drops the empty case", () => {
  assertEquals(metadata('{"plan":"pro"}'), { plan: "pro" });
  assertEquals(metadata({ a: 1 }), { a: 1 });
  assertEquals(metadata(""), undefined);
  assertEquals(metadata({}), undefined);
  assertEquals(metadata(undefined), undefined);
});

Deno.test("metadata: rejects a non-object rather than silently sending it", () => {
  assertThrows(() => metadata("[1,2]"), Error, "must be a JSON object");
});

Deno.test("unset: a blank form field is absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});
