import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import type { HookContext, TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import orderCreated from "../../triggers/order-created.ts";
import genericEvent from "../../triggers/event.ts";
import { parseTopicList, type TriggerState } from "../../lib/triggers.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const HOST = "https://api.example.test";
const SECRET = "7f3a9c1e5b2d48860f1e2d3c4b5a69788796a5b4c3d2e1f00112233445566778";
const display = { storeUrl: "https://shop.example.com" };
const API = "https://shop.example.com/wp-json/wc/v3";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** An order body with whitespace WooCommerce's compact JSON never has, so re-serialising differs. */
const BODY = `{
  "id": 727,
  "status": "processing",
  "total": "29.99",
  "note": "caf\\u00e9 \\/ ok",
  "line_items": [ { "id": 315, "quantity": 2 } ]
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
  "x-wc-webhook-source": "https://shop.example.com/",
  "x-wc-webhook-topic": "order.created",
  "x-wc-webhook-resource": "order",
  "x-wc-webhook-event": "created",
  "x-wc-webhook-id": "142",
  "x-wc-webhook-delivery-id": "a3b0c4d5e6f708192a3b4c5d6e7f8091",
};

function signed(body = BODY, extra: Record<string, string> = {}): TriggerCall {
  return delivery(body, { ...META, "x-wc-webhook-signature": sign(body), ...extra });
}

const STATE: TriggerState = {
  webhookId: "142",
  webhookIds: ["142"],
  topics: ["order.created"],
  secret: SECRET,
};

function ingest(
  trigger: typeof orderCreated,
  call: TriggerCall,
  state: Partial<TriggerState> | null = STATE,
) {
  return trigger.handleIngest!(
    {
      raw: call,
      params: {},
      state: (state ?? undefined) as TriggerState,
      subscriptionId: "sub_abc",
    },
    mockCtx([], { display }).ctx,
  );
}

test("fixture: the body is not canonical JSON, so re-serialising would break the signature", () => {
  assertEquals(JSON.stringify(JSON.parse(BODY)) !== BODY, true);
});

test("the app declares seven webhook triggers, each with output and a sample", () => {
  const triggers = app.triggers ?? [];
  assertEquals(triggers.length, 7);
  for (const t of triggers) {
    assertEquals(typeof t.handleIngest, "function", t.key);
    assertEquals(typeof t.onSubscribe, "function", t.key);
    assertEquals(typeof t.onUnsubscribe, "function", t.key);
    assertEquals(typeof t.poll, "undefined", t.key);
    assertEquals((t.output?.length ?? 0) > 0, true, t.key);
    assertEquals(t.sample !== undefined, true, t.key);
  }
});

test("handleIngest: a valid signature over the exact bytes yields the event", async () => {
  assertEquals(evs(await ingest(orderCreated, signed())), [{
    topic: "order.created",
    resource: "order",
    event: "created",
    webhookId: "142",
    deliveryId: "a3b0c4d5e6f708192a3b4c5d6e7f8091",
    source: "https://shop.example.com/",
    payload: JSON.parse(BODY),
  }]);
});

test("handleIngest: header names are matched case-insensitively", async () => {
  const call = delivery(BODY, {
    "X-WC-Webhook-Topic": "order.created",
    "X-WC-Webhook-ID": "142",
    "X-WC-Webhook-Signature": sign(BODY),
  });
  assertEquals(evs(await ingest(orderCreated, call)).length, 1);
});

test("handleIngest: one flipped byte in the body throws", async () => {
  const call = delivery(BODY.replace("29.99", "29.98"), {
    ...META,
    "x-wc-webhook-signature": sign(BODY),
  });
  await assertRejects(async () => await ingest(orderCreated, call), Error, "signature");
});

test("handleIngest: a flipped byte in the signature, or the wrong secret, throws", async () => {
  const sig = sign(BODY);
  const bad = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
  await assertRejects(
    async () => await ingest(orderCreated, signed(BODY, { "x-wc-webhook-signature": bad })),
    Error,
    "signature",
  );
  await assertRejects(
    async () => await ingest(orderCreated, signed(), { ...STATE, secret: "another-secret-value" }),
    Error,
    "signature",
  );
});

test("handleIngest: a signature made over re-serialised JSON is refused", async () => {
  const compact = JSON.stringify(JSON.parse(BODY));
  const call = delivery(BODY, { ...META, "x-wc-webhook-signature": sign(compact) });
  await assertRejects(async () => await ingest(orderCreated, call), Error, "signature");
});

test("handleIngest: a missing or empty signature header throws", async () => {
  await assertRejects(
    async () => await ingest(orderCreated, delivery(BODY, META)),
    Error,
    "X-WC-Webhook-Signature",
  );
  await assertRejects(
    async () => await ingest(orderCreated, signed(BODY, { "x-wc-webhook-signature": "" })),
    Error,
    "X-WC-Webhook-Signature",
  );
});

test("handleIngest: an absent rawBody throws (never falls back to the parsed body)", async () => {
  const call = signed();
  delete call.rawBody;
  await assertRejects(async () => await ingest(orderCreated, call), Error, "raw body");
});

test("handleIngest: an unset or empty secret refuses, even with an absent or empty signature", async () => {
  for (const secret of [undefined, ""]) {
    const state = { ...STATE, secret } as unknown as Partial<TriggerState>;
    await assertRejects(
      async () => await ingest(orderCreated, delivery(BODY, META), state),
      Error,
      "secret",
    );
    await assertRejects(
      async () =>
        await ingest(
          orderCreated,
          delivery(BODY, { ...META, "x-wc-webhook-signature": "" }),
          state,
        ),
      Error,
      "secret",
    );
  }
  // No state at all: a delivery that beat the subscription's own registration is not trusted.
  await assertRejects(async () => await ingest(orderCreated, signed(), null), Error, "secret");
});

test("handleIngest: error text never echoes the secret, the signature or the body", async () => {
  const sig = sign(BODY, "someone-elses-secret");
  const messages: string[] = [];
  for (const call of [signed(BODY, { "x-wc-webhook-signature": sig }), delivery(BODY, META)]) {
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

test("handleIngest: a signed delivery from another webhook is refused", async () => {
  await assertRejects(
    async () => await ingest(orderCreated, signed(BODY, { "x-wc-webhook-id": "999" })),
    Error,
    "different webhook",
  );
});

test("handleIngest: non-POST throws; a topic outside the subscription is acknowledged with none", async () => {
  await assertRejects(
    async () => await ingest(orderCreated, { ...signed(), method: "GET" }),
    Error,
    "POST",
  );
  assertEquals(
    evs(await ingest(orderCreated, signed(BODY, { "x-wc-webhook-topic": "order.updated" }))),
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

test("handleIngest: the creation ping (form body webhook_id=<id>) is acknowledged with no event", async () => {
  const ping = delivery("webhook_id=142", {});
  assertEquals(evs(await ingest(orderCreated, ping)), []);
  // It may beat onSubscribe's own return, when no state is stored yet.
  assertEquals(evs(await ingest(orderCreated, ping, null)), []);
  // A ping naming some other webhook is refused once this subscription knows its own ids.
  await assertRejects(
    async () => await ingest(orderCreated, delivery("webhook_id=7", {})),
    Error,
    "different webhook",
  );
});

test("handleIngest: only the exact ping body is exempt from the signature", async () => {
  for (
    const body of [
      "webhook_id=142&x=1",
      "webhook_id=",
      " webhook_id=142",
      BODY,
      '{"webhook_id":142}',
    ]
  ) {
    await assertRejects(async () => await ingest(orderCreated, delivery(body, {})), Error);
  }
  // A ping body carrying WooCommerce headers is not the ping: it must verify.
  await assertRejects(
    async () => await ingest(orderCreated, delivery("webhook_id=142", META)),
    Error,
    "X-WC-Webhook-Signature",
  );
  await assertRejects(
    async () =>
      await ingest(orderCreated, delivery("webhook_id=142", { "x-wc-webhook-signature": "AAAA" })),
    Error,
    "signature",
  );
});

test("handleIngest: the generic trigger follows its stored topic list", async () => {
  const state: TriggerState = { ...STATE, topics: ["coupon.updated"] };
  assertEquals(evs(await ingest(genericEvent, signed(), state)), []);
  const both: TriggerState = { ...STATE, topics: ["coupon.updated", "order.created"] };
  assertEquals(evs(await ingest(genericEvent, signed(), both)).length, 1);
});

test("parseTopicList: trims, drops blanks and duplicates", () => {
  assertEquals(parseTopicList(" order.created, ,order.updated,order.created "), [
    "order.created",
    "order.updated",
  ]);
  assertEquals(parseTopicList(undefined), []);
});

function subscribe(
  trigger: typeof orderCreated,
  params: Record<string, unknown>,
  ctx: HookContext,
) {
  return trigger.onSubscribe!(
    { params, subscriptionId: "sub_abc", callbackUrl: CALLBACK, hostUrl: HOST },
    ctx,
  ) as Promise<TriggerState>;
}

test("onSubscribe: lists, then creates the webhook with a random secret kept in state", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: 5, delivery_url: "https://elsewhere.test/x", topic: "order.created" }] },
    { status: 201, body: { id: 142, topic: "order.created", status: "active" } },
  ], { display });
  const state = await subscribe(orderCreated, {}, ctx);
  assertEquals(state.webhookId, "142");
  assertEquals(state.webhookIds, ["142"]);
  assertEquals(state.topics, ["order.created"]);
  assertEquals(/^[0-9a-f]{64}$/.test(state.secret), true);
  assertEquals(calls.length, 2);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API}/webhooks?per_page=100&page=1`);
  assertEquals(calls[1].method, "POST");
  assertEquals(calls[1].url, `${API}/webhooks`);
  assertEquals(JSON.parse(calls[1].body ?? ""), {
    name: "w6w order.created",
    topic: "order.created",
    delivery_url: CALLBACK,
    secret: state.secret,
    status: "active",
  });
});

test("onSubscribe: each subscription gets its own secret", async () => {
  const one = mockCtx([{ body: [] }, { status: 201, body: { id: 1 } }], { display });
  const two = mockCtx([{ body: [] }, { status: 201, body: { id: 2 } }], { display });
  const a = await subscribe(orderCreated, {}, one.ctx);
  const b = await subscribe(orderCreated, {}, two.ctx);
  assertEquals(a.secret !== b.secret, true);
});

test("onSubscribe: deletes a leftover webhook carrying this callback URL first", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: 77, delivery_url: CALLBACK, topic: "order.created" }] },
    { body: { id: 77, status: "active" } },
    { status: 201, body: { id: 78 } },
  ], { display });
  await subscribe(orderCreated, {}, ctx);
  assertEquals(calls[1].method, "DELETE");
  assertEquals(calls[1].url, `${API}/webhooks/77?force=true`);
  assertEquals(calls[2].method, "POST");
});

test("onSubscribe: the generic trigger creates one webhook per topic with one shared secret", async () => {
  const { ctx, calls } = mockCtx([
    { body: [] },
    { status: 201, body: { id: 1 } },
    { status: 201, body: { id: 2 } },
  ], { display });
  const state = await subscribe(genericEvent, { topics: "coupon.updated, order.deleted" }, ctx);
  assertEquals(state.webhookIds, ["1", "2"]);
  assertEquals(state.topics, ["coupon.updated", "order.deleted"]);
  assertEquals(JSON.parse(calls[1].body ?? "").topic, "coupon.updated");
  assertEquals(JSON.parse(calls[2].body ?? "").topic, "order.deleted");
  assertEquals(JSON.parse(calls[2].body ?? "").secret, state.secret);
  await assertRejects(
    async () => await subscribe(genericEvent, { topics: " , " }, mockCtx([], { display }).ctx),
    Error,
    "at least one",
  );
});

test("onSubscribe: a later topic failing removes the webhooks already created", async () => {
  const { ctx, calls } = mockCtx([
    { body: [] },
    { status: 201, body: { id: 1 } },
    { status: 400, body: { code: "woocommerce_rest_webhook_invalid_topic" } },
    { body: { id: 1 } },
  ], { display });
  await assertRejects(
    async () => await subscribe(genericEvent, { topics: "order.created, bogus" }, ctx),
    Error,
    "400",
  );
  assertEquals(calls[3].method, "DELETE");
  assertEquals(calls[3].url, `${API}/webhooks/1?force=true`);
});

test("onUnsubscribe: deletes every recorded webhook; 404 and 410 mean already gone", async () => {
  const run = (ctx: HookContext, state: Partial<TriggerState> = STATE) =>
    orderCreated.onUnsubscribe!(
      { params: {}, state: state as TriggerState, subscriptionId: "sub_abc" },
      ctx,
    );
  const ok = mockCtx([{ body: {} }, { body: {} }], { display });
  await run(ok.ctx, { ...STATE, webhookIds: ["142", "143"] });
  assertEquals(ok.calls.map((c) => `${c.method} ${c.url}`), [
    `DELETE ${API}/webhooks/142?force=true`,
    `DELETE ${API}/webhooks/143?force=true`,
  ]);
  for (const status of [404, 410]) {
    await run(
      mockCtx([{ status, body: { code: "woocommerce_rest_invalid_id" } }], { display }).ctx,
    );
  }
  await assertRejects(
    async () => await run(mockCtx([{ status: 500, body: { message: "boom" } }], { display }).ctx),
    Error,
    "500",
  );
  const none = mockCtx([], { display });
  await run(none.ctx, {});
  assertEquals(none.calls.length, 0);
});
