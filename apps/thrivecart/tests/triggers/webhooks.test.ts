import { test } from "node:test";
import { readFileSync } from "node:fs";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import newPurchase from "../../triggers/new-purchase.ts";
import subscriptionPayment from "../../triggers/subscription-payment.ts";
import subscriptionCancelled from "../../triggers/subscription-cancelled.ts";
import thrivecartEvent from "../../triggers/thrivecart-event.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

const fixed = [
  { t: newPurchase, key: "new-purchase", event: "order_payment_product" },
  { t: subscriptionPayment, key: "subscription-payment", event: "order_rebill" },
  { t: subscriptionCancelled, key: "subscription-cancelled", event: "order_rebill_cancelled" },
];

const call = (
  body: unknown,
  state: unknown = { event: "order_payment_product", callbackUrl: CALLBACK, subscriptionId: 5 },
  method = "POST",
) => ({
  raw: { method, path: "/", query: {}, headers: {} as Record<string, string>, body },
  params: {},
  state,
  subscriptionId: "sub_1",
});

test("app declares the webhook triggers with output and sample, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key).slice(0, 4), [
    "new-purchase",
    "subscription-payment",
    "subscription-cancelled",
    "thrivecart-event",
  ]);
  for (const t of app.triggers.filter((t) => !t.poll)) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
    assertEquals(typeof t.handleIngest, "function");
    // unsigned vendor: no secret param, no invented signature
    assert(!(t.params ?? []).some((p) => p.type === "secret"));
  }
});

for (const { t, event } of fixed) {
  test(`${event}: onSubscribe POSTs the documented JSON body to /subscribe and keeps the URL`, async () => {
    const { ctx, calls } = mockCtx([{ status: 201, body: { subscription_id: 253485285 } }]);
    const state = await t.onSubscribe!(
      { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
      ctx,
    );
    assertEquals(state, { event, callbackUrl: CALLBACK, subscriptionId: 253485285 });
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, "POST");
    assertEquals(calls[0].url, "https://thrivecart.com/api/external/subscribe");
    assertEquals(calls[0].headers["content-type"], "application/json");
    assertEquals(JSON.parse(calls[0].body!), { event, target_url: CALLBACK });
  });
}

test("onSubscribe passes trigger fields through (object or JSON text) and none when empty", async () => {
  const a = mockCtx([{ status: 201, body: { subscription_id: 1 } }]);
  await newPurchase.onSubscribe!(
    {
      params: { triggerFields: { mode_int: 2, base_product: [5, 19] } },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    a.ctx,
  );
  assertEquals(JSON.parse(a.calls[0].body!).trigger_fields, { mode_int: 2, base_product: [5, 19] });
  const b = mockCtx([{ status: 201, body: { subscription_id: 2 } }]);
  await newPurchase.onSubscribe!(
    {
      params: { triggerFields: '{"mode_int": 1}' },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    b.ctx,
  );
  assertEquals(JSON.parse(b.calls[0].body!).trigger_fields, { mode_int: 1 });
  const c = mockCtx([{ status: 201, body: { subscription_id: 3 } }]);
  await newPurchase.onSubscribe!(
    { params: { triggerFields: "" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
    c.ctx,
  );
  assert(!("trigger_fields" in JSON.parse(c.calls[0].body!)));
});

test("thrivecart-event: the event param is required, validated, and sent", async () => {
  const ok = mockCtx([{ status: 201, body: { subscription_id: 9 } }]);
  const state = await thrivecartEvent.onSubscribe!(
    {
      params: { event: " cart_abandoned " },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    ok.ctx,
  );
  assertEquals(JSON.parse(ok.calls[0].body!).event, "cart_abandoned");
  assertEquals((state as { event: string }).event, "cart_abandoned");
  const all = mockCtx([{ status: 201, body: { subscription_id: 10 } }]);
  await thrivecartEvent.onSubscribe!(
    { params: { event: "*" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
    all.ctx,
  );
  assertEquals(JSON.parse(all.calls[0].body!).event, "*");
  for (const event of [undefined, "", "Order Payment", "x"]) {
    const none = mockCtx([]);
    await assertRejects(() =>
      Promise.resolve(thrivecartEvent.onSubscribe!(
        { params: { event }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        none.ctx,
      ))
    );
    assertEquals(none.calls.length, 0);
  }
});

test("onSubscribe rejects malformed trigger fields before any request", async () => {
  for (const triggerFields of ["{not json", "[1,2]", 7]) {
    const none = mockCtx([]);
    await assertRejects(() =>
      Promise.resolve(newPurchase.onSubscribe!(
        { params: { triggerFields }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        none.ctx,
      ))
    );
    assertEquals(none.calls.length, 0);
  }
});

test("onSubscribe: a ThriveCart rejection (unregistered target URL) propagates", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: "invalid_target_url", error_description: "target_url is not registered" },
  }]);
  await assertRejects(() =>
    Promise.resolve(newPurchase.onSubscribe!(
      { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
      ctx,
    ))
  );
});

test("onUnsubscribe POSTs the stored callback URL as form field url", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await newPurchase.onUnsubscribe!(
    {
      params: {},
      state: { event: "order_payment_product", callbackUrl: CALLBACK, subscriptionId: 5 },
      subscriptionId: "sub_1",
    },
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://thrivecart.com/api/external/unsubscribe");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URLSearchParams(calls[0].body!).get("url"), CALLBACK);
});

test("onUnsubscribe: 404 = already gone; any other error propagates; no state = no call", async () => {
  const state = { event: "order_rebill", callbackUrl: CALLBACK, subscriptionId: 5 };
  const gone = mockCtx([{ status: 404, body: { error: "not_found" } }]);
  await subscriptionPayment.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, gone.ctx);
  const boom = mockCtx([{ status: 500, body: { error: "server_error" } }]);
  await assertRejects(() =>
    Promise.resolve(
      subscriptionPayment.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, boom.ctx),
    )
  );
  const none = mockCtx([]);
  await subscriptionPayment.onUnsubscribe!(
    { params: {}, state: undefined, subscriptionId: "s" },
    none.ctx,
  );
  await subscriptionPayment.onUnsubscribe!(
    { params: {}, state: { callbackUrl: "" }, subscriptionId: "s" },
    none.ctx,
  );
  assertEquals(none.calls.length, 0);
});

test("a delivery is parsed into one event (unsigned: no header or secret needed)", async () => {
  const body = {
    event: "order_payment_product",
    webhook_id: "2f0c6c1e-8d57-4e0a-9a43-6c1d5b7f9a10",
    event_id: 10293847,
    customer: { email: "ada@example.com" },
  };
  const out = evs(await newPurchase.handleIngest!(call(body), mockCtx().ctx)) as Array<
    Record<string, unknown>
  >;
  assertEquals(out.length, 1);
  assertEquals(out[0].event, "order_payment_product");
  assertEquals(out[0].webhookId, "2f0c6c1e-8d57-4e0a-9a43-6c1d5b7f9a10");
  assertEquals(out[0].eventId, "10293847");
  assertEquals(out[0].data, body);
});

test("the event name falls back to the subscribed event when the body does not name it; * stays null", async () => {
  const named = evs(
    await subscriptionPayment.handleIngest!(
      call({ webhook_id: "w1" }, {
        event: "order_rebill",
        callbackUrl: CALLBACK,
        subscriptionId: 1,
      }),
      mockCtx().ctx,
    ),
  ) as Array<Record<string, unknown>>;
  assertEquals(named[0].event, "order_rebill");
  assertEquals(named[0].eventId, null);
  const all = evs(
    await thrivecartEvent.handleIngest!(
      call({ webhook_id: "w2" }, { event: "*", callbackUrl: CALLBACK, subscriptionId: 1 }),
      mockCtx().ctx,
    ),
  ) as Array<Record<string, unknown>>;
  assertEquals(all[0].event, null);
});

test("a JSON string body is parsed; a non-object body or a non-POST method is refused", async () => {
  const text = evs(
    await newPurchase.handleIngest!(call('{ "event": "order_payment_product" }'), mockCtx().ctx),
  ) as Array<Record<string, unknown>>;
  assertEquals(text[0].event, "order_payment_product");
  for (const body of [null, "not json", [1, 2], 7]) {
    await assertRejects(async () => await newPurchase.handleIngest!(call(body), mockCtx().ctx));
  }
  await assertRejects(async () =>
    await newPurchase.handleIngest!(call({}, undefined, "GET"), mockCtx().ctx)
  );
});

test("README states the URL-is-the-secret trust model", () => {
  const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
  assert(/## Triggers/.test(readme));
  assert(/callback URL is the secret/i.test(readme));
});
