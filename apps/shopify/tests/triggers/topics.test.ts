import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import type { HookContext, TriggerCall } from "@w6w/types";
import { mockShopifyCtx } from "../_helpers.ts";
import app from "../../index.ts";
import type { TriggerState } from "../../lib/triggers.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const HOST = "https://api.example.test";
const SECRET = "test-secret";
const WEBHOOKS = "https://acme.myshopify.com/admin/api/2024-07/webhooks.json";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// [trigger key, the Shopify webhook topic it registers and accepts]
const CASES: Array<[string, string]> = [
  ["customer-updated", "customers/update"],
  ["customer-deleted", "customers/delete"],
  ["order-deleted", "orders/delete"],
  ["product-deleted", "products/delete"],
  ["inventory-level-updated", "inventory_levels/update"],
  ["location-created", "locations/create"],
  ["location-updated", "locations/update"],
  ["location-deleted", "locations/delete"],
];

// Whitespace Shopify's compact JSON never has, so re-serialising would change the bytes.
const BODY = `{
  "id": 706405506930370000,
  "email": "bob@example.com"
}`;

/** The expected signature, computed with node:crypto: independent of the app's code. */
function sign(body: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(body).digest("base64");
}

function delivery(rawBody: string | undefined, headers: Record<string, string>): TriggerCall {
  const call: TriggerCall = {
    method: "POST",
    path: "/triggers/webhooks/sub_abc",
    query: {},
    headers,
    body: rawBody === undefined ? undefined : JSON.parse(rawBody),
  };
  if (rawBody !== undefined) call.rawBody = rawBody;
  return call;
}

const meta = (topic: string) => ({
  "x-shopify-topic": topic,
  "x-shopify-shop-domain": "acme.myshopify.com",
  "x-shopify-webhook-id": "b54557e4-bdd9-4b37-8a5f-bf7d70bcd043",
});

const trigger = (key: string) => app.triggers.find((t) => t.key === key)!;
const stateFor = (topic: string): TriggerState => ({
  webhookId: "901",
  webhookIds: ["901"],
  topics: [topic],
  shop: "acme",
});

function ingest(
  key: string,
  topic: string,
  call: TriggerCall,
  secret: string | null = SECRET,
) {
  return trigger(key).handleIngest!(
    {
      raw: call,
      params: { signingSecret: secret ?? undefined },
      state: stateFor(topic),
      subscriptionId: "sub_abc",
    },
    mockShopifyCtx().ctx,
  );
}

function subscribe(key: string, ctx: HookContext) {
  return trigger(key).onSubscribe!(
    {
      params: { signingSecret: SECRET },
      subscriptionId: "sub_abc",
      callbackUrl: CALLBACK,
      hostUrl: HOST,
    },
    ctx,
  ) as Promise<TriggerState>;
}

test("every new trigger is wired in index.ts with output, sample and a required secret param", () => {
  const keys = app.triggers.map((t) => t.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const [key] of CASES) {
    assertEquals(keys.includes(key), true, key);
    const t = trigger(key);
    assertEquals(t.output.length > 0, true, key);
    assertEquals(t.sample !== undefined, true, key);
    const secret = t.params!.find((p) => p.key === "signingSecret");
    assertEquals(secret?.type, "secret", key);
    assertEquals(secret?.required, true, key);
    assertEquals(typeof t.poll, "undefined", key);
  }
});

for (const [key, topic] of CASES) {
  test(`${key}: onSubscribe registers exactly the ${topic} webhook; onUnsubscribe deletes it`, async () => {
    const { ctx, calls } = mockShopifyCtx([
      { body: { webhooks: [] } },
      { status: 201, body: { webhook: { id: 4759306 } } },
    ]);
    const state = await subscribe(key, ctx);
    assertEquals(state, {
      webhookId: "4759306",
      topics: [topic],
      shop: "acme",
      webhookIds: ["4759306"],
    });
    assertEquals(calls[1].method, "POST");
    assertEquals(calls[1].url, WEBHOOKS);
    assertEquals(
      calls[1].body,
      `{"webhook":{"topic":"${topic}","address":"${CALLBACK}","format":"json"}}`,
    );

    const gone = mockShopifyCtx([{ body: {} }]);
    await trigger(key).onUnsubscribe!({ params: {}, state, subscriptionId: "sub_abc" }, gone.ctx);
    assertEquals(gone.calls.length, 1);
    assertEquals(gone.calls[0].method, "DELETE");
    assertEquals(
      gone.calls[0].url,
      "https://acme.myshopify.com/admin/api/2024-07/webhooks/4759306.json",
    );
  });

  test(`${key}: a valid signature over the exact bytes yields one event; another topic yields none`, async () => {
    const ok = delivery(BODY, { ...meta(topic), "x-shopify-hmac-sha256": sign(BODY) });
    const out = evs(await ingest(key, topic, ok)) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].topic, topic);
    assertEquals(out[0].shopDomain, "acme.myshopify.com");
    assertEquals(out[0].resource, JSON.parse(BODY));
    const other = delivery(BODY, { ...meta("orders/paid"), "x-shopify-hmac-sha256": sign(BODY) });
    assertEquals(evs(await ingest(key, topic, other)), []);
  });

  test(`${key}: flipped byte, missing header, absent rawBody, unset secret, other store -> refused`, async () => {
    const good = { ...meta(topic), "x-shopify-hmac-sha256": sign(BODY) };
    await assertRejects(
      async () => await ingest(key, topic, delivery(BODY.replace("bob", "rob"), good)),
      Error,
      "signature",
    );
    const noSig = { ...meta(topic) };
    await assertRejects(
      async () => await ingest(key, topic, delivery(BODY, noSig)),
      Error,
      "missing",
    );
    await assertRejects(
      async () => await ingest(key, topic, delivery(undefined, good)),
      Error,
      "raw body",
    );
    for (const secret of [null, ""]) {
      await assertRejects(
        async () => await ingest(key, topic, delivery(BODY, good), secret),
        Error,
        "secret",
      );
      // an unset secret must not let a delivery without a signature through either
      await assertRejects(
        async () => await ingest(key, topic, delivery(BODY, noSig), secret),
        Error,
        "secret",
      );
    }
    const elsewhere = { ...good, "x-shopify-shop-domain": "other.myshopify.com" };
    await assertRejects(
      async () => await ingest(key, topic, delivery(BODY, elsewhere)),
      Error,
      "different store",
    );
  });
}
