import { test } from "node:test";
import { createHash } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import newSale from "../../triggers/new-sale.ts";
import saleRefunded from "../../triggers/sale-refunded.ts";
import newSubscription from "../../triggers/new-subscription.ts";
import subscriptionCancelled from "../../triggers/subscription-cancelled.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const API_KEY = "test-payhip-api-key-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const sig = (key = API_KEY) => createHash("sha256").update(key).digest("hex");

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const sale = (type: string, signature = sig()) =>
  `{ "id" : "ZGjVj5x4GN",  "email":"buyer@example.com", "currency":"USD", "price": 900,
  "items": [ { "product_id":"2804256", "product_name":"Sample Product" } ],
  "payment_type":"card", "date": 1762768800, "amount_refunded": 900, "date_refunded": 1762769000,
  "date_created": 1762768800, "type":"${type}", "signature":"${signature}" }`;
const subscription = (type: string, signature = sig()) =>
  `{ "subscription_id" : "sub-1",  "customer_id":"cust-1", "status":"active",
  "customer_email":"buyer@example.com", "plan_name":"Silver Plan", "product_name":"My Course",
  "product_link":"nb7fD", "date_subscription_started": 1762768800,
  "customer_first_name":"Sample", "customer_last_name":"Buyer",
  "type":"${type}", "signature":"${signature}" }`;

const call = (b: string, over: Record<string, unknown> = {}, apiKey: string | null = API_KEY) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: {} as Record<string, string>,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params: { apiKey: apiKey ?? undefined },
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});
// deno-lint-ignore no-explicit-any
const ingest = (t: any, input: ReturnType<typeof call>) => t.handleIngest!(input, mockCtx().ctx);

test("fixture bodies have non-canonical whitespace", () => {
  for (const b of [sale("paid"), subscription("subscription.created")]) {
    assert(JSON.stringify(JSON.parse(b)) !== b);
  }
});

test("app declares the four webhook triggers with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "new-sale",
    "sale-refunded",
    "new-subscription",
    "subscription-cancelled",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(t.params!.map((p) => p.key), ["apiKey"]);
    assertEquals(t.params![0].type, "secret");
  }
});

test("a signed paid delivery → one normalized sale event, signature not emitted", async () => {
  const out = evs(await ingest(newSale, call(sale("paid")))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].transactionId, "ZGjVj5x4GN");
  assertEquals(out[0].price, 900);
  assertEquals(out[0].email, "buyer@example.com");
  assert(!JSON.stringify(out[0]).includes(sig()));
});

test("each trigger takes only its own event type", async () => {
  const cases: Array<[unknown, string, string]> = [
    [newSale, sale("paid"), "paid"],
    [saleRefunded, sale("refunded"), "refunded"],
    [newSubscription, subscription("subscription.created"), "subscription.created"],
    [subscriptionCancelled, subscription("subscription.deleted"), "subscription.deleted"],
  ];
  for (const [t, body, type] of cases) {
    const out = evs(await ingest(t, call(body))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].type, type);
    for (const [other, , otherType] of cases) {
      if (otherType !== type) {
        assertEquals(evs(await ingest(other, call(body))), []);
      }
    }
  }
});

test("a refund and a subscription are normalized", async () => {
  const r = evs(await ingest(saleRefunded, call(sale("refunded")))) as Array<
    Record<string, unknown>
  >;
  assertEquals(r[0].amountRefunded, 900);
  assertEquals(r[0].dateRefunded, 1762769000);
  const s = evs(await ingest(newSubscription, call(subscription("subscription.created")))) as Array<
    Record<string, unknown>
  >;
  assertEquals(s[0].subscriptionId, "sub-1");
  assertEquals(s[0].planName, "Silver Plan");
  assertEquals(s[0].customerEmail, "buyer@example.com");
});

test("a signature from another key → refused", async () => {
  await assertRejects(
    () => ingest(newSale, call(sale("paid", sig("another-api-key-value-xxxxxxxx")))),
    Error,
    "signature",
  );
});

test("a signature with one flipped character → refused", async () => {
  const good = sig();
  const flipped = (good[0] === "a" ? "b" : "a") + good.slice(1);
  await assertRejects(() => ingest(newSale, call(sale("paid", flipped))), Error, "signature");
});

test("a signature with one flipped byte of the body is still the key's token (documented limit)", async () => {
  // Payhip's signature does not cover the body: tampering with the body alone is NOT detected.
  const tampered = sale("paid").replace("ZGjVj5x4GN", "ZGjVj5x4GM");
  const out = evs(await ingest(newSale, call(tampered))) as Array<Record<string, unknown>>;
  assertEquals(out[0].transactionId, "ZGjVj5x4GM");
});

test("signature missing or empty → refused", async () => {
  const noSig = sale("paid").replace(/,\s*"signature"[^}]*/, " ");
  await assertRejects(() => ingest(newSale, call(noSig)), Error, "no signature");
  await assertRejects(() => ingest(newSale, call(sale("paid", ""))), Error, "no signature");
});

test("rawBody absent → refused, even with a correct signature", async () => {
  const c = call(sale("paid"));
  delete (c.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(newSale, c), Error, "raw body");
});

test("unset or empty api key → refused, even for a signature of the empty string", async () => {
  for (const key of [null, ""]) {
    await assertRejects(() => ingest(newSale, call(sale("paid"), {}, key)), Error, "secret");
    await assertRejects(
      () => ingest(newSale, call(sale("paid", sig("")), {}, key)),
      Error,
      "secret",
    );
  }
});

test("a body that is not JSON → refused", async () => {
  await assertRejects(() => ingest(newSale, call("{}", { rawBody: "not json" })), Error, "JSON");
});

test("errors never contain the api key or the signature", async () => {
  const wrong = sig("another-api-key-value-xxxxxxxx");
  try {
    await ingest(newSale, call(sale("paid", wrong)));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(API_KEY) && !m.includes(wrong) && !m.includes(sig()));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(() => ingest(newSale, call(sale("paid"), { method: "GET" })), Error, "POST");
});

test("onSubscribe makes no vendor call and returns the callback URL; onUnsubscribe is a no-op", async () => {
  const { ctx, calls } = mockCtx();
  const state = await newSale.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await newSale.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
  assertEquals(calls.length, 0);
});
