import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import type { TriggerState } from "../../lib/triggers.ts";

/**
 * Round-3 topics: customer.updated, customer.deleted, product.deleted, plus the coverage the
 * full topic catalog needs (https://woocommerce.github.io/woocommerce-rest-api-docs/#webhooks,
 * verified 2026-11-10). One signed-delivery case set per trigger.
 */
const SECRET = "test-secret";
const display = { storeUrl: "https://shop.example.com" };
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

const CASES = [
  {
    key: "customer-updated",
    topic: "customer.updated",
    resource: "customer",
    event: "updated",
    body: `{
  "id": 25,
  "email": "john.doe@example.com",
  "first_name": "John",
  "note": "caf\\u00e9 \\/ ok"
}`,
  },
  {
    key: "customer-deleted",
    topic: "customer.deleted",
    resource: "customer",
    event: "deleted",
    body: `{ "id": 25 }`,
  },
  {
    key: "product-deleted",
    topic: "product.deleted",
    resource: "product",
    event: "deleted",
    body: `{ "id" : 794 }`,
  },
];

/** The expected signature, computed with node:crypto, independent of the app's code. */
function sign(body: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(body).digest("base64");
}

function call(
  c: typeof CASES[number],
  body: string | undefined,
  signature: string | undefined,
): TriggerCall {
  const headers: Record<string, string> = {
    "x-wc-webhook-source": "https://shop.example.com/",
    "x-wc-webhook-topic": c.topic,
    "x-wc-webhook-resource": c.resource,
    "x-wc-webhook-event": c.event,
    "x-wc-webhook-id": "142",
    "x-wc-webhook-delivery-id": "delivery-1",
  };
  if (signature !== undefined) headers["x-wc-webhook-signature"] = signature;
  const t: TriggerCall = {
    method: "POST",
    path: "/triggers/webhooks/sub_abc",
    query: {},
    headers,
    body: body === undefined ? undefined : JSON.parse(body),
  };
  if (body !== undefined) t.rawBody = body;
  return t;
}

function ingest(key: string, raw: TriggerCall, stored: { secret?: string } = { secret: SECRET }) {
  const trigger = (app.triggers ?? []).find((t) => t.key === key)!;
  const state = {
    webhookId: "142",
    webhookIds: ["142"],
    topics: [trigger.sample ? (trigger.sample as { topic: string }).topic : ""],
    secret: stored.secret,
  } as unknown as TriggerState;
  return trigger.handleIngest!(
    { raw, params: {}, state, subscriptionId: "sub_abc" },
    mockCtx([], { display }).ctx,
  );
}

for (const c of CASES) {
  test(`${c.key}: fixture body is not canonical JSON`, () => {
    assertEquals(JSON.stringify(JSON.parse(c.body)) !== c.body, true);
  });

  test(`${c.key}: declared with output, sample and the ${c.topic} topic`, () => {
    const t = (app.triggers ?? []).find((x) => x.key === c.key)!;
    assertEquals(typeof t.handleIngest, "function");
    assertEquals((t.output?.length ?? 0) > 0, true);
    assertEquals((t.sample as { topic: string }).topic, c.topic);
    assertEquals((t.sample as { resource: string }).resource, c.resource);
    assertEquals((t.sample as { event: string }).event, c.event);
  });

  test(`${c.key}: a valid signature over the exact bytes yields the event`, async () => {
    assertEquals(evs(await ingest(c.key, call(c, c.body, sign(c.body)))), [{
      topic: c.topic,
      resource: c.resource,
      event: c.event,
      webhookId: "142",
      deliveryId: "delivery-1",
      source: "https://shop.example.com/",
      payload: JSON.parse(c.body),
    }]);
  });

  test(`${c.key}: one flipped byte in the SIGNATURE throws`, async () => {
    const sig = sign(c.body);
    const bad = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
    await assertRejects(async () => await ingest(c.key, call(c, c.body, bad)), Error, "signature");
    const tail = sig.slice(0, 10) + (sig[10] === "A" ? "B" : "A") + sig.slice(11);
    await assertRejects(async () => await ingest(c.key, call(c, c.body, tail)), Error, "signature");
  });

  test(`${c.key}: one flipped byte in the body throws`, async () => {
    const tampered = c.body.replace(/(\d)(\D*)$/, (_m, d, rest) => (d === "9" ? "8" : "9") + rest);
    assertEquals(tampered !== c.body, true);
    await assertRejects(
      async () => await ingest(c.key, call(c, tampered, sign(c.body))),
      Error,
      "signature",
    );
  });

  test(`${c.key}: a signature over re-serialised JSON is refused`, async () => {
    const compact = JSON.stringify(JSON.parse(c.body));
    await assertRejects(
      async () => await ingest(c.key, call(c, c.body, sign(compact))),
      Error,
      "signature",
    );
  });

  test(`${c.key}: a missing or empty signature header throws`, async () => {
    await assertRejects(
      async () => await ingest(c.key, call(c, c.body, undefined)),
      Error,
      "X-WC-Webhook-Signature",
    );
    await assertRejects(
      async () => await ingest(c.key, call(c, c.body, "")),
      Error,
      "X-WC-Webhook-Signature",
    );
  });

  test(`${c.key}: an absent rawBody throws`, async () => {
    await assertRejects(
      async () => await ingest(c.key, call(c, undefined, sign(c.body))),
      Error,
      "raw body",
    );
  });

  test(`${c.key}: an unset or empty secret refuses before any compare`, async () => {
    for (const secret of [undefined, ""]) {
      await assertRejects(
        async () => await ingest(c.key, call(c, c.body, undefined), { secret }),
        Error,
        "secret",
      );
      await assertRejects(
        async () => await ingest(c.key, call(c, c.body, ""), { secret }),
        Error,
        "secret",
      );
    }
  });

  test(`${c.key}: a delivery for another topic is acknowledged with no event`, async () => {
    const other = { ...c, topic: "order.created", resource: "order", event: "created" };
    assertEquals(evs(await ingest(c.key, call(other, c.body, sign(c.body)))), []);
  });
}

test("the three round-3 triggers register one webhook each at the callback URL", async () => {
  for (const c of CASES) {
    const trigger = (app.triggers ?? []).find((t) => t.key === c.key)!;
    const { ctx, calls } = mockCtx([{ body: [] }, { status: 201, body: { id: 301 } }], { display });
    const state = await trigger.onSubscribe!(
      {
        params: {},
        subscriptionId: "sub_abc",
        callbackUrl: "https://api.example.test/triggers/webhooks/sub_abc",
        hostUrl: "https://api.example.test",
      },
      ctx,
    ) as TriggerState;
    assertEquals(state.topics, [c.topic]);
    assertEquals(state.webhookIds, ["301"]);
    assertEquals(calls[0].method, "GET");
    assertEquals(
      calls[0].url,
      "https://shop.example.com/wp-json/wc/v3/webhooks?per_page=100&page=1",
    );
    assertEquals(calls[1].method, "POST");
    assertEquals(calls[1].url, "https://shop.example.com/wp-json/wc/v3/webhooks");
    const body = JSON.parse(calls[1].body ?? "");
    assertEquals(body.topic, c.topic);
    assertEquals(body.delivery_url, "https://api.example.test/triggers/webhooks/sub_abc");
    assertEquals(body.status, "active");
  }
});
