import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";

/**
 * The webhook triggers added in round 3: one Stripe event type each. The signature scheme is the
 * shared one (`lib/triggers.ts`); every trigger is driven through all of it here, with the
 * expected signature computed by node:crypto, a non-canonical body, and a LITERAL registration
 * request.
 */

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const SECRET = "test-secret";

/** [trigger key, the one Stripe event type it registers for, the object kind in data.object]. */
const CASES: Array<[string, string, string]> = [
  ["customer-updated", "customer.updated", "customer"],
  ["customer-deleted", "customer.deleted", "customer"],
  ["subscription-updated", "customer.subscription.updated", "subscription"],
  ["invoice-created", "invoice.created", "invoice"],
  ["invoice-finalized", "invoice.finalized", "invoice"],
  ["invoice-voided", "invoice.voided", "invoice"],
  ["payment-intent-created", "payment_intent.created", "payment_intent"],
  ["payment-intent-canceled", "payment_intent.canceled", "payment_intent"],
  ["charge-succeeded", "charge.succeeded", "charge"],
  ["charge-failed", "charge.failed", "charge"],
  ["refund-created", "refund.created", "refund"],
  ["refund-updated", "refund.updated", "refund"],
  ["product-created", "product.created", "product"],
  ["product-updated", "product.updated", "product"],
  ["product-deleted", "product.deleted", "product"],
  ["price-created", "price.created", "price"],
  ["price-updated", "price.updated", "price"],
  ["price-deleted", "price.deleted", "price"],
  ["checkout-expired", "checkout.session.expired", "checkout.session"],
];

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const nowSec = () => Math.floor(Date.now() / 1000);

/** A Stripe event body with whitespace Stripe's compact JSON never has. */
function bodyFor(type: string, kind: string): string {
  return `{
  "id": "evt_sample_0001",
  "object": "event",
  "api_version": "2024-06-20",
  "created": 1767225600,
  "data": { "object": { "id": "obj_sample_1", "object": "${kind}" } },
  "livemode": false,
  "request": { "id": "req_sample_1" },
  "type": "${type}"
}`;
}

const sign = (body: string, ts: number, secret = SECRET) =>
  createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");

function call(rawBody: string | undefined, headers: Record<string, string>): TriggerCall {
  const c: TriggerCall = {
    method: "POST",
    path: "/triggers/webhooks/sub_abc",
    query: {},
    headers,
    body: rawBody === undefined ? undefined : JSON.parse(rawBody),
  };
  if (rawBody !== undefined) c.rawBody = rawBody;
  return c;
}

for (const [key, type, kind] of CASES) {
  const trigger = (app.triggers ?? []).find((t) => t.key === key);
  const state = { webhookId: "we_1", secret: SECRET, events: [type] };
  const body = bodyFor(type, kind);
  const ingest = (raw: TriggerCall, st: Record<string, unknown> = state) =>
    trigger!.handleIngest!(
      // deno-lint-ignore no-explicit-any
      { raw, params: {}, state: st as any, subscriptionId: "sub_abc" },
      mockCtx().ctx,
    );
  const good = (b = body, ts = nowSec()) =>
    call(b, { "stripe-signature": `t=${ts},v1=${sign(b, ts)}` });

  test(`${key}: is declared with output, a sample and the webhook lifecycle`, () => {
    assertEquals(trigger !== undefined, true);
    assertEquals((trigger!.output?.length ?? 0) > 0, true);
    assertEquals(trigger!.sample !== undefined, true);
    assertEquals(typeof trigger!.onSubscribe, "function");
    assertEquals(typeof trigger!.onUnsubscribe, "function");
    assertEquals(typeof trigger!.poll, "undefined");
    assertEquals(JSON.stringify(JSON.parse(body)) !== body, true);
  });

  test(`${key}: registers one endpoint for ${type} (literal request)`, async () => {
    const { ctx, calls } = mockCtx([
      { body: { data: [], has_more: false } },
      { body: { id: "we_new", secret: "test-endpoint-secret" } },
    ]);
    const out = await trigger!.onSubscribe!({ params: {}, callbackUrl: CALLBACK }, ctx);
    assertEquals(out, { webhookId: "we_new", secret: "test-endpoint-secret", events: [type] });
    assertEquals(calls[1].method, "POST");
    assertEquals(calls[1].url, "https://api.stripe.com/v1/webhook_endpoints");
    assertEquals(
      calls[1].body,
      "url=https%3A%2F%2Fapi.example.test%2Ftriggers%2Fwebhooks%2Fsub_abc" +
        `&enabled_events%5B0%5D=${type}` +
        "&api_version=2024-06-20&description=w6w%20trigger%20subscription",
    );
  });

  test(`${key}: a valid signature over the exact bytes yields the event`, async () => {
    const out = evs(await ingest(good()));
    assertEquals(out.length, 1);
    assertEquals((out[0] as { type: string }).type, type);
    assertEquals((out[0] as { object: { object: string } }).object.object, kind);
  });

  test(`${key}: a flipped byte, a missing header and an absent rawBody are refused`, async () => {
    const ts = nowSec();
    const tampered = body.replace("evt_sample_0001", "evt_sample_0002");
    await assertRejects(
      async () =>
        await ingest(call(tampered, { "stripe-signature": `t=${ts},v1=${sign(body, ts)}` })),
      Error,
      "signature",
    );
    const sig = sign(body, ts);
    const flipped = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    await assertRejects(
      async () => await ingest(call(body, { "stripe-signature": `t=${ts},v1=${flipped}` })),
      Error,
      "signature",
    );
    await assertRejects(async () => await ingest(call(body, {})), Error, "Stripe-Signature");
    await assertRejects(
      async () => await ingest(call(undefined, { "stripe-signature": `t=${ts},v1=${sig}` })),
      Error,
      "raw body",
    );
    // a signature over re-serialised JSON is not the signature over the bytes Stripe sent
    const canonical = JSON.stringify(JSON.parse(body));
    await assertRejects(
      async () =>
        await ingest(call(body, { "stripe-signature": `t=${ts},v1=${sign(canonical, ts)}` })),
      Error,
      "signature",
    );
  });

  test(`${key}: a stale or future timestamp is refused even with a correct signature`, async () => {
    await assertRejects(async () => await ingest(good(body, nowSec() - 400)), Error, "timestamp");
    await assertRejects(async () => await ingest(good(body, nowSec() + 400)), Error, "timestamp");
  });

  test(`${key}: an unset or empty secret is refused first, signature or not`, async () => {
    for (const secret of [undefined, ""]) {
      await assertRejects(
        async () => await ingest(call(body, {}), { ...state, secret }),
        Error,
        "secret",
      );
      await assertRejects(
        async () => await ingest(good(), { ...state, secret }),
        Error,
        "secret",
      );
    }
  });

  test(`${key}: a verified event of another type is acknowledged with none`, async () => {
    const other = bodyFor("payout.paid", "payout");
    assertEquals(evs(await ingest(good(other))), []);
  });
}
