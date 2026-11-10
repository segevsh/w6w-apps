import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import anyEvent from "../../triggers/any-event.ts";
import disputeRaised from "../../triggers/dispute-raised.ts";
import disputeWon from "../../triggers/dispute-won.ts";
import saleRefunded from "../../triggers/sale-refunded.ts";
import subscriptionCancelled from "../../triggers/subscription-cancelled.ts";
import subscriptionEnded from "../../triggers/subscription-ended.ts";
import subscriptionRestarted from "../../triggers/subscription-restarted.ts";
import subscriptionUpdated from "../../triggers/subscription-updated.ts";
import { mockCtx } from "../_helpers.ts";

// Gumroad's own reference (gumroad.com/api, resource subscriptions + /ping, read 2026-11-10) says
// resource-subscription notifications are NOT signed ("are not signed with this secret"): the
// private callback URL is the only credential, so there is no signature to verify or forge here.
const callbackUrl = "https://hooks.example.test/gumroad/sub_1";
const encoded = "https%3A%2F%2Fhooks.example.test%2Fgumroad%2Fsub_1";
const form = "content-type";

const NAMED = [
  [saleRefunded, "sale-refunded", "refund", "sale_id", "sale_id=s1&email=buyer%40example.test"],
  [disputeRaised, "dispute-raised", "dispute", "sale_id", "sale_id=s1&email=buyer%40example.test"],
  [disputeWon, "dispute-won", "dispute_won", "sale_id", "sale_id=s1&email=buyer%40example.test"],
  [
    subscriptionCancelled,
    "subscription-cancelled",
    "cancellation",
    "subscription_id",
    "subscription_id=u1&cancelled=true",
  ],
  [
    subscriptionUpdated,
    "subscription-updated",
    "subscription_updated",
    "subscription_id",
    "subscription_id=u1&type=upgrade",
  ],
  [
    subscriptionEnded,
    "subscription-ended",
    "subscription_ended",
    "subscription_id",
    "subscription_id=u1&ended_reason=cancelled",
  ],
  [
    subscriptionRestarted,
    "subscription-restarted",
    "subscription_restarted",
    "subscription_id",
    "subscription_id=u1&restarted_at=2026-12-10",
  ],
] as const;

const post = (body: unknown, extra: Record<string, unknown> = {}) => ({
  method: "POST",
  path: "",
  query: {},
  headers: { [form]: "application/x-www-form-urlencoded" },
  body,
  ...extra,
});
const input = (raw: unknown, params: Record<string, unknown> = {}) =>
  ({ raw, params, state: {}, subscriptionId: "sub" }) as never;

for (const [trigger, key, resource, idKey, body] of NAMED) {
  test(`${key}: registers only the ${resource} resource, replacing a stale registration of its URL`, async () => {
    assertEquals(trigger.key, key);
    const { ctx, calls } = mockCtx([
      { body: { success: true, resource_subscriptions: [{ id: "old", post_url: callbackUrl }] } },
      { body: { success: true } },
      { body: { success: true, resource_subscription: { id: "new" } } },
    ]);
    const state = await trigger.onSubscribe!(
      { params: {}, callbackUrl, subscriptionId: "sub" },
      ctx,
    );
    assertEquals(state, { webhookIds: ["new"] });
    assertEquals(calls.map((c) => [c.method, new URL(c.url).pathname, new URL(c.url).search]), [
      ["GET", "/v2/resource_subscriptions", `?resource_name=${resource}`],
      ["DELETE", "/v2/resource_subscriptions/old", ""],
      ["PUT", "/v2/resource_subscriptions", ""],
    ]);
    assertEquals(calls[2].body, `resource_name=${resource}&post_url=${encoded}`);
  });

  test(`${key}: unsubscribe deletes the stored id and tolerates 404/410`, async () => {
    const ok = mockCtx([{ body: { success: true } }]);
    await trigger.onUnsubscribe!(
      { params: {}, state: { webhookIds: ["a=="] }, subscriptionId: "sub" },
      ok.ctx,
    );
    assertEquals(ok.calls.map((c) => [c.method, new URL(c.url).pathname]), [
      ["DELETE", "/v2/resource_subscriptions/a%3D%3D"],
    ]);
    for (const status of [404, 410]) {
      await trigger.onUnsubscribe!(
        { params: {}, state: { webhookIds: ["a"] }, subscriptionId: "sub" },
        mockCtx([{ status, body: { success: false } }]).ctx,
      );
    }
  });

  test(`${key}: maps a form delivery, de-duplicates by ${idKey}, refuses non-POST`, async () => {
    const events = await trigger.handleIngest!(input(post(body)), mockCtx().ctx);
    assertEquals(Array.isArray(events), true);
    assertEquals((events as Record<string, string>[]).length, 1);
    assertEquals((events as Record<string, string>[])[0][idKey], idKey === "sale_id" ? "s1" : "u1");
    const dup = await trigger.handleIngest!(
      input(post([{ [idKey]: "d1" }, { [idKey]: "d1" }, { other: "x" }])),
      mockCtx().ctx,
    );
    assertEquals(dup, [{ [idKey]: "d1" }]);
    let thrown: unknown;
    try {
      await trigger.handleIngest!(input(post(body, { method: "GET" })), mockCtx().ctx);
    } catch (error) {
      thrown = error;
    }
    assertEquals(/POST/.test(String(thrown)), true);
  });

  test(`${key}: declares output and a sample`, () => {
    assertEquals(trigger.output!.length > 0, true);
    assertEquals(trigger.sample !== undefined, true);
  });
}

test("any-event: no events param registers all eight resources, each URL tagged with its resource", async () => {
  const resources = [
    "sale",
    "refund",
    "dispute",
    "dispute_won",
    "cancellation",
    "subscription_updated",
    "subscription_ended",
    "subscription_restarted",
  ];
  const responses = resources.flatMap((_, i) => [
    { body: { success: true, resource_subscriptions: [] } },
    { body: { success: true, resource_subscription: { id: `id${i}` } } },
  ]);
  const { ctx, calls } = mockCtx(responses);
  const state = await anyEvent.onSubscribe!(
    { params: {}, callbackUrl, subscriptionId: "sub" },
    ctx,
  );
  assertEquals(state, { webhookIds: resources.map((_, i) => `id${i}`) });
  assertEquals(calls.length, 16);
  assertEquals(calls[0].url.endsWith("/v2/resource_subscriptions?resource_name=sale"), true);
  assertEquals(calls[1].body, `resource_name=sale&post_url=${encoded}%3Fw6w_resource%3Dsale`);
  assertEquals(
    calls[15].body,
    `resource_name=subscription_restarted&post_url=${encoded}%3Fw6w_resource%3Dsubscription_restarted`,
  );
});

test("any-event: the events param is the registered list; an unknown name is refused before any request", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, resource_subscriptions: [] } },
    { body: { success: true, resource_subscription: { id: "r" } } },
    { body: { success: true, resource_subscriptions: [] } },
    { body: { success: true, resource_subscription: { id: "s" } } },
  ]);
  const state = await anyEvent.onSubscribe!(
    {
      params: { events: " refund, subscription_ended,refund" },
      callbackUrl,
      subscriptionId: "sub",
    },
    ctx,
  );
  assertEquals(state, { webhookIds: ["r", "s"] });
  assertEquals(calls.length, 4);
  assertEquals(calls[1].body?.startsWith("resource_name=refund&"), true);
  assertEquals(calls[3].body?.startsWith("resource_name=subscription_ended&"), true);
  const refused = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(anyEvent.onSubscribe!(
        { params: { events: "sale,nope" }, callbackUrl, subscriptionId: "sub" },
        refused.ctx,
      )),
    Error,
    "nope",
  );
  assertEquals(refused.calls.length, 0);
});

test("any-event: a failed registration rolls back the ones already made", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, resource_subscriptions: [] } },
    { body: { success: true, resource_subscription: { id: "first" } } },
    { body: { success: true, resource_subscriptions: [] } },
    { status: 400, body: { success: false, message: "bad url" } },
    { body: { success: true } },
  ]);
  await assertRejects(
    () =>
      Promise.resolve(anyEvent.onSubscribe!(
        { params: { events: "sale,refund" }, callbackUrl, subscriptionId: "sub" },
        ctx,
      )),
    Error,
  );
  assertEquals([calls[4].method, new URL(calls[4].url).pathname], [
    "DELETE",
    "/v2/resource_subscriptions/first",
  ]);
});

test("any-event: unsubscribe deletes every stored id", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }, { body: { success: true } }]);
  await anyEvent.onUnsubscribe!(
    { params: {}, state: { webhookIds: ["a", "b"] }, subscriptionId: "sub" },
    ctx,
  );
  assertEquals(calls.map((c) => [c.method, new URL(c.url).pathname]), [
    ["DELETE", "/v2/resource_subscriptions/a"],
    ["DELETE", "/v2/resource_subscriptions/b"],
  ]);
});

test("any-event: tags the delivery from the callback query, filters to the events list", async () => {
  const sale = post("sale_id=s1&email=b%40example.test", { query: { w6w_resource: "sale" } });
  const ended = post("subscription_id=u1&ended_reason=cancelled", {
    query: { w6w_resource: "subscription_ended" },
  });
  const all = await anyEvent.handleIngest!(input(sale), mockCtx().ctx);
  assertEquals(all, [{ sale_id: "s1", email: "b@example.test", resource_name: "sale" }]);
  const only = { events: "subscription_ended" };
  assertEquals(await anyEvent.handleIngest!(input(sale, only), mockCtx().ctx), []);
  assertEquals(await anyEvent.handleIngest!(input(ended, only), mockCtx().ctx), [
    { subscription_id: "u1", ended_reason: "cancelled", resource_name: "subscription_ended" },
  ]);
  // Gumroad's own resource_name wins over the tag; an untagged delivery is kept.
  const own = post("sale_id=s2&resource_name=refund", { query: { w6w_resource: "sale" } });
  assertEquals(
    ((await anyEvent.handleIngest!(input(own), mockCtx().ctx)) as Record<string, string>[])[0]
      .resource_name,
    "refund",
  );
  const untagged = post("sale_id=s3");
  assertEquals(await anyEvent.handleIngest!(input(untagged, only), mockCtx().ctx), [
    { sale_id: "s3" },
  ]);
});

test("register deletes only its own callback URL, never another subscriber's", async () => {
  const other = "https://other.example.test/hook";
  const { ctx, calls } = mockCtx([
    {
      body: {
        success: true,
        resource_subscriptions: [
          { id: "theirs", post_url: other },
          { id: "mine", post_url: callbackUrl },
        ],
      },
    },
    { body: { success: true } },
    { body: { success: true, resource_subscription: { id: "new" } } },
  ]);
  await saleRefunded.onSubscribe!({ params: {}, callbackUrl, subscriptionId: "sub" }, ctx);
  assertEquals(
    calls.filter((c) => c.method === "DELETE").map((c) => new URL(c.url).pathname),
    ["/v2/resource_subscriptions/mine"],
  );
});

test("unsubscribe treats Gumroad's HTTP 200 success:false 'not found' as already gone", async () => {
  await saleRefunded.onUnsubscribe!(
    { params: {}, state: { webhookIds: ["a"] }, subscriptionId: "sub" },
    mockCtx([{
      status: 200,
      body: { success: false, message: "The resource_subscription was not found." },
    }]).ctx,
  );
});

test("any-event: unsubscribe keeps deleting the later ids after one fails, then reports the failure", async () => {
  const { ctx, calls } = mockCtx([
    { status: 500, body: { success: false, message: "boom" } },
    { body: { success: true } },
    { body: { success: true } },
  ]);
  await assertRejects(
    () =>
      Promise.resolve(anyEvent.onUnsubscribe!(
        { params: {}, state: { webhookIds: ["a", "b", "c"] }, subscriptionId: "sub" },
        ctx,
      )),
    Error,
    "500",
  );
  assertEquals(calls.map((c) => [c.method, new URL(c.url).pathname]), [
    ["DELETE", "/v2/resource_subscriptions/a"],
    ["DELETE", "/v2/resource_subscriptions/b"],
    ["DELETE", "/v2/resource_subscriptions/c"],
  ]);
});

test("subscription-updated: declares the bracket keys Gumroad sends and delivers them as sent", async () => {
  const declared = subscriptionUpdated.output!.map((f) => f.key);
  for (const key of ["old_plan[recurrence]", "new_plan[price_cents]", "new_plan[quantity]"]) {
    assertEquals(declared.includes(key), true);
  }
  assertEquals(declared.includes("old_plan"), false);
  const body = "subscription_id=u1&type=upgrade&old_plan%5Brecurrence%5D=monthly" +
    "&new_plan%5Brecurrence%5D=yearly&new_plan%5Bprice_cents%5D=12000";
  const events = await subscriptionUpdated.handleIngest!(input(post(body)), mockCtx().ctx);
  assertEquals(events, [{
    subscription_id: "u1",
    type: "upgrade",
    "old_plan[recurrence]": "monthly",
    "new_plan[recurrence]": "yearly",
    "new_plan[price_cents]": "12000",
  }]);
  for (const key of Object.keys(subscriptionUpdated.sample!)) {
    assertEquals(key === "old_plan" || key === "new_plan", false);
  }
});
