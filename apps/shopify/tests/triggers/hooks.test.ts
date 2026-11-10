import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import type { HookContext, TriggerCall } from "@w6w/types";
import { mockShopifyCtx } from "../_helpers.ts";
import app from "../../index.ts";
import orderCreated from "../../triggers/order-created.ts";
import genericEvent from "../../triggers/event.ts";
import { parseTopicList, type TriggerState } from "../../lib/triggers.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const HOST = "https://api.example.test";
const SECRET = "shpss_0123456789abcdef0123456789abcdef";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** An order body with whitespace Shopify's compact JSON never has, so re-serialising differs. */
const BODY = `{
  "id": 820982911946154500,
  "name": "#1001",
  "total_price": "199.00",
  "note": "caf\\u00e9",
  "line_items": [ { "id": 1, "quantity": 2 } ]
}`;

/** The expected signature, computed with node:crypto — independent of the app's code. */
function sign(body: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(body).digest("base64");
}

function delivery(
  rawBody: string | undefined,
  headers: Record<string, string>,
  method = "POST",
): TriggerCall {
  let body: unknown = rawBody;
  try {
    body = rawBody === undefined ? undefined : JSON.parse(rawBody);
  } catch { /* keep text */ }
  const call: TriggerCall = {
    method,
    path: "/triggers/webhooks/sub_abc",
    query: {},
    headers,
    body,
  };
  if (rawBody !== undefined) call.rawBody = rawBody;
  return call;
}

const META = {
  "x-shopify-topic": "orders/create",
  "x-shopify-shop-domain": "acme.myshopify.com",
  "x-shopify-webhook-id": "b54557e4-bdd9-4b37-8a5f-bf7d70bcd043",
  "x-shopify-event-id": "98880cc8-1ee9-4a5c-8d6d-3d2a1ee0b2f5",
  "x-shopify-triggered-at": "2026-11-09T10:12:50.123456789Z",
  "x-shopify-api-version": "2024-07",
};

function signed(body = BODY, extra: Record<string, string> = {}): TriggerCall {
  return delivery(body, { ...META, "x-shopify-hmac-sha256": sign(body), ...extra });
}

const STATE: TriggerState = {
  webhookId: "901",
  webhookIds: ["901"],
  topics: ["orders/create"],
  shop: "acme",
};

function ingest(
  trigger: typeof orderCreated,
  call: TriggerCall,
  state: Partial<TriggerState> | undefined = STATE,
  signingSecret: string | null = SECRET,
) {
  return trigger.handleIngest!(
    {
      raw: call,
      params: { signingSecret: signingSecret ?? undefined },
      state: state as TriggerState,
      subscriptionId: "sub_abc",
    },
    mockShopifyCtx().ctx,
  );
}

test("fixture: the body is not canonical JSON, so re-serialising would break the signature", () => {
  assertEquals(JSON.stringify(JSON.parse(BODY)) !== BODY, true);
});

test("the app declares eighteen webhook triggers, each with output, sample and the secret param", () => {
  const triggers = app.triggers ?? [];
  assertEquals(triggers.length, 18);
  for (const t of triggers) {
    assertEquals(typeof t.handleIngest, "function", t.key);
    assertEquals(typeof t.onSubscribe, "function", t.key);
    assertEquals(typeof t.onUnsubscribe, "function", t.key);
    assertEquals(typeof t.poll, "undefined", t.key);
    assertEquals((t.output?.length ?? 0) > 0, true, t.key);
    assertEquals(t.sample !== undefined, true, t.key);
    const secret = (t.params ?? []).find((p) => p.key === "signingSecret");
    assertEquals(secret?.type, "secret", t.key);
    assertEquals(secret?.required, true, t.key);
  }
});

test("handleIngest: a valid signature over the exact bytes yields the event", async () => {
  const out = evs(await ingest(orderCreated, signed()));
  assertEquals(out, [{
    topic: "orders/create",
    shopDomain: "acme.myshopify.com",
    webhookId: "b54557e4-bdd9-4b37-8a5f-bf7d70bcd043",
    eventId: "98880cc8-1ee9-4a5c-8d6d-3d2a1ee0b2f5",
    triggeredAt: "2026-11-09T10:12:50.123456789Z",
    apiVersion: "2024-07",
    resource: JSON.parse(BODY),
  }]);
});

test("handleIngest: header names are matched case-insensitively", async () => {
  const call = delivery(BODY, {
    "X-Shopify-Topic": "orders/create",
    "X-Shopify-Shop-Domain": "acme.myshopify.com",
    "X-Shopify-Hmac-SHA256": sign(BODY),
  });
  assertEquals(evs(await ingest(orderCreated, call)).length, 1);
});

test("handleIngest: one flipped byte in the body throws", async () => {
  const call = delivery(BODY.replace("199.00", "199.01"), {
    ...META,
    "x-shopify-hmac-sha256": sign(BODY),
  });
  await assertRejects(async () => await ingest(orderCreated, call), Error, "signature");
});

test("handleIngest: a flipped byte in the signature, or the wrong secret, throws", async () => {
  const sig = sign(BODY);
  const bad = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
  await assertRejects(
    async () => await ingest(orderCreated, signed(BODY, { "x-shopify-hmac-sha256": bad })),
    Error,
    "signature",
  );
  await assertRejects(
    async () => await ingest(orderCreated, signed(), STATE, "another-secret"),
    Error,
    "signature",
  );
});

test("handleIngest: a signature made over re-serialised JSON is refused", async () => {
  const compact = JSON.stringify(JSON.parse(BODY));
  const call = delivery(BODY, { ...META, "x-shopify-hmac-sha256": sign(compact) });
  await assertRejects(async () => await ingest(orderCreated, call), Error, "signature");
});

test("handleIngest: a missing or empty signature header throws", async () => {
  await assertRejects(
    async () => await ingest(orderCreated, delivery(BODY, META)),
    Error,
    "X-Shopify-Hmac-Sha256",
  );
  await assertRejects(
    async () => await ingest(orderCreated, signed(BODY, { "x-shopify-hmac-sha256": "" })),
    Error,
    "X-Shopify-Hmac-Sha256",
  );
});

test("handleIngest: an absent rawBody throws (never falls back to the parsed body)", async () => {
  const call = signed();
  delete call.rawBody;
  await assertRejects(async () => await ingest(orderCreated, call), Error, "raw body");
});

test("handleIngest: an unset or empty secret refuses, even with an absent or empty signature", async () => {
  for (const secret of [null, ""]) {
    await assertRejects(
      async () => await ingest(orderCreated, delivery(BODY, META), STATE, secret),
      Error,
      "secret",
    );
    await assertRejects(
      async () =>
        await ingest(
          orderCreated,
          delivery(BODY, { ...META, "x-shopify-hmac-sha256": "" }),
          STATE,
          secret,
        ),
      Error,
      "secret",
    );
  }
});

test("handleIngest: error text never echoes the secret, the signature or the body", async () => {
  const sig = sign(BODY, "someone-elses-secret");
  const messages: string[] = [];
  for (const call of [signed(BODY, { "x-shopify-hmac-sha256": sig }), delivery(BODY, META)]) {
    try {
      await ingest(orderCreated, call);
    } catch (err) {
      messages.push((err as Error).message);
    }
  }
  assertEquals(messages.length, 2);
  for (const m of messages) {
    assertEquals(m.includes(SECRET) || m.includes(sig) || m.includes("someone-elses"), false);
  }
});

test("handleIngest: a delivery for another store is refused even when validly signed", async () => {
  await assertRejects(
    async () =>
      await ingest(orderCreated, signed(BODY, { "x-shopify-shop-domain": "evil.myshopify.com" })),
    Error,
    "different store",
  );
  const call = delivery(BODY, {
    "x-shopify-topic": "orders/create",
    "x-shopify-hmac-sha256": sign(BODY),
  });
  await assertRejects(async () => await ingest(orderCreated, call), Error, "different store");
});

test("handleIngest: non-POST throws; a topic outside the subscription is acknowledged with none", async () => {
  await assertRejects(
    async () => await ingest(orderCreated, { ...signed(), method: "GET" }),
    Error,
    "POST",
  );
  assertEquals(
    evs(await ingest(orderCreated, signed(BODY, { "x-shopify-topic": "orders/paid" }))),
    [],
  );
});

test("handleIngest: a verified body that is not a JSON object throws", async () => {
  await assertRejects(
    async () => await ingest(orderCreated, signed("[1, 2]")),
    Error,
    "JSON object",
  );
});

test("handleIngest: the generic trigger follows its stored topic list", async () => {
  const state: TriggerState = { ...STATE, topics: ["customers/update"] };
  assertEquals(evs(await ingest(genericEvent, signed(), state)), []);
  const both: TriggerState = { ...STATE, topics: ["customers/update", "orders/create"] };
  assertEquals(evs(await ingest(genericEvent, signed(), both)).length, 1);
});

test("parseTopicList: trims, drops blanks and duplicates", () => {
  assertEquals(parseTopicList(" orders/create, ,orders/paid,orders/create "), [
    "orders/create",
    "orders/paid",
  ]);
  assertEquals(parseTopicList(undefined), []);
});

function subscribe(
  trigger: typeof orderCreated,
  params: Record<string, unknown>,
  ctx: HookContext,
) {
  return trigger.onSubscribe!(
    {
      params: { signingSecret: SECRET, ...params },
      subscriptionId: "sub_abc",
      callbackUrl: CALLBACK,
      hostUrl: HOST,
    },
    ctx,
  ) as Promise<TriggerState>;
}

const WEBHOOKS = "https://acme.myshopify.com/admin/api/2024-07/webhooks.json";

test("onSubscribe: lists by address, then creates the webhook", async () => {
  const { ctx, calls } = mockShopifyCtx([
    { body: { webhooks: [] } },
    { status: 201, body: { webhook: { id: 4759306, topic: "orders/create" } } },
  ]);
  const state = await subscribe(orderCreated, {}, ctx);
  assertEquals(state, {
    webhookId: "4759306",
    topics: ["orders/create"],
    shop: "acme",
    webhookIds: ["4759306"],
  });
  assertEquals(calls.length, 2);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    `${WEBHOOKS}?address=https%3A%2F%2Fapi.example.test%2Ftriggers%2Fwebhooks%2Fsub_abc&limit=250&fields=id%2Caddress%2Ctopic`,
  );
  assertEquals(calls[1].method, "POST");
  assertEquals(calls[1].url, WEBHOOKS);
  assertEquals(
    calls[1].body,
    `{"webhook":{"topic":"orders/create","address":"${CALLBACK}","format":"json"}}`,
  );
});

test("onSubscribe: deletes a leftover subscription carrying this callback URL first", async () => {
  const { ctx, calls } = mockShopifyCtx([
    { body: { webhooks: [{ id: 77, address: CALLBACK, topic: "orders/create" }] } },
    { body: {} },
    { status: 201, body: { webhook: { id: 78 } } },
  ]);
  await subscribe(orderCreated, {}, ctx);
  assertEquals(calls[1].method, "DELETE");
  assertEquals(calls[1].url, "https://acme.myshopify.com/admin/api/2024-07/webhooks/77.json");
  assertEquals(calls[2].method, "POST");
});

test("onSubscribe: the generic trigger registers one subscription per listed topic", async () => {
  const { ctx, calls } = mockShopifyCtx([
    { body: { webhooks: [] } },
    { status: 201, body: { webhook: { id: 1 } } },
    { status: 201, body: { webhook: { id: 2 } } },
  ]);
  const state = await subscribe(genericEvent, { topics: "customers/update, orders/paid" }, ctx);
  assertEquals(state.topics, ["customers/update", "orders/paid"]);
  assertEquals(state.webhookIds, ["1", "2"]);
  assertEquals(JSON.parse(calls[1].body ?? "").webhook.topic, "customers/update");
  assertEquals(JSON.parse(calls[2].body ?? "").webhook.topic, "orders/paid");
});

test("onSubscribe: a later topic failing removes the ones already created", async () => {
  const { ctx, calls } = mockShopifyCtx([
    { body: { webhooks: [] } },
    { status: 201, body: { webhook: { id: 1 } } },
    { status: 422, body: { errors: { topic: ["is invalid"] } } },
    { body: {} },
  ]);
  await assertRejects(
    async () => await subscribe(genericEvent, { topics: "orders/paid, bogus/topic" }, ctx),
    Error,
    "422",
  );
  assertEquals(calls[3].method, "DELETE");
  assertEquals(calls[3].url, "https://acme.myshopify.com/admin/api/2024-07/webhooks/1.json");
});

test("onSubscribe: refuses to register without a signing secret", async () => {
  const { ctx, calls } = mockShopifyCtx();
  await assertRejects(
    async () => await subscribe(orderCreated, { signingSecret: "" }, ctx),
    Error,
    "secret",
  );
  assertEquals(calls.length, 0);
});

test("onUnsubscribe: deletes every recorded subscription; 404 and 410 mean already gone", async () => {
  const run = (ctx: HookContext, state: Partial<TriggerState> = STATE) =>
    orderCreated.onUnsubscribe!(
      { params: {}, state: state as TriggerState, subscriptionId: "sub_abc" },
      ctx,
    );
  const ok = mockShopifyCtx([{ body: {} }, { body: {} }]);
  await run(ok.ctx, { ...STATE, webhookIds: ["901", "902"] });
  assertEquals(ok.calls.map((c) => `${c.method} ${new URL(c.url).pathname}`), [
    "DELETE /admin/api/2024-07/webhooks/901.json",
    "DELETE /admin/api/2024-07/webhooks/902.json",
  ]);
  for (const status of [404, 410]) {
    await run(mockShopifyCtx([{ status, body: { errors: "Not Found" } }]).ctx);
  }
  await assertRejects(
    async () => await run(mockShopifyCtx([{ status: 500, body: { errors: "boom" } }]).ctx),
    Error,
    "500",
  );
  const none = mockShopifyCtx();
  await run(none.ctx, {});
  assertEquals(none.calls.length, 0);
});
