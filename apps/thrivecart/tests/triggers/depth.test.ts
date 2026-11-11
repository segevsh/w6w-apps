import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_2";
const find = (key: string) => app.triggers.find((t) => t.key === key)!;

const hooks: Array<[string, string]> = [
  ["new-bump-purchase", "order_payment_bump"],
  ["new-upsell-purchase", "order_payment_upsell"],
  ["new-downsell-purchase", "order_payment_downsell"],
  ["payment-declined", "order_payment_declined_product"],
  ["order-refunded", "order_refund"],
  ["subscription-payment-failed", "order_rebill_failed"],
  ["cart-abandoned", "cart_abandoned"],
  ["subscription-paused", "subscription_paused"],
  ["subscription-resumed", "subscription_resumed"],
  ["affiliate-created", "affiliate_created"],
  ["affiliate-approved", "affiliate_approved"],
  ["commission-earned", "affiliate_commission_earned"],
];

for (const [key, event] of hooks) {
  test(`${key}: subscribes to ${event}, unsubscribes by URL, parses a delivery`, async () => {
    const t = find(key);
    assert(t.output!.length > 0 && t.sample !== undefined);
    const sub = mockCtx([{ status: 201, body: { subscription_id: 7 } }]);
    const state = await t.onSubscribe!(
      { params: {}, subscriptionId: "sub_2", callbackUrl: CALLBACK, hostUrl: "" },
      sub.ctx,
    );
    assertEquals(sub.calls[0].method, "POST");
    assertEquals(sub.calls[0].url, "https://thrivecart.com/api/external/subscribe");
    assertEquals(JSON.parse(sub.calls[0].body!), { event, target_url: CALLBACK });
    assertEquals(state, { event, callbackUrl: CALLBACK, subscriptionId: 7 });
    const un = mockCtx([{ status: 200, body: [] }]);
    await t.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_2" }, un.ctx);
    assertEquals(un.calls[0].url, "https://thrivecart.com/api/external/unsubscribe");
    assertEquals(new URLSearchParams(un.calls[0].body!).get("url"), CALLBACK);
    const out = await t.handleIngest!({
      raw: {
        method: "POST",
        path: "/",
        query: {},
        headers: {},
        body: { event, webhook_id: "w-1", event_id: 3 },
      },
      params: {},
      state,
      subscriptionId: "sub_2",
    }, mockCtx().ctx);
    const events = Array.isArray(out) ? out : (out as { events: unknown[] }).events;
    assertEquals(events, [{
      event,
      webhookId: "w-1",
      eventId: "3",
      data: { event, webhook_id: "w-1", event_id: 3 },
    }]);
  });
}

const polls: Array<[string, string, string, string]> = [
  ["new-product", "/products", "product_id", "products"],
  ["new-bump", "/bumps", "bump_id", "bumps"],
  ["new-upsell", "/upsells", "upsell_id", "upsells"],
  ["new-downsell", "/downsells", "downsell_id", "downsells"],
];

for (const [key, path, idField] of polls) {
  test(`${key}: seed, one new item, idempotent, literal request ${path}`, async () => {
    const t = find(key);
    assert(t.output!.length > 0 && t.sample !== undefined);
    const input = { params: {}, subscriptionId: "s" };
    const seed = mockCtx([{ body: [{ [idField]: "1", name: "a" }] }]);
    const seeded = await t.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, `https://thrivecart.com/api/external${path}`);
    const next = [{ [idField]: "1", name: "a" }, { [idField]: "2", name: "b" }];
    const run = () => t.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: next }]).ctx);
    const a = await run();
    assertEquals(a.events.map((e) => (e as { key: string }).key), ["2"]);
    assertEquals(a, await run());
  });
}

test("a snapshot trigger sends the chosen mode header", async () => {
  const m = mockCtx([{ body: [] }]);
  await find("new-product").poll!(
    { params: { mode: "test" }, subscriptionId: "s", state: {} },
    m.ctx,
  );
  assertEquals(m.calls[0].headers["x-tc-mode"], "test");
});
