import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import type { HookContext, TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import paymentSucceeded from "../../triggers/payment-succeeded.ts";
import genericEvent from "../../triggers/event.ts";
import { parseSignatureHeader, type TriggerState } from "../../lib/triggers.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const HOST = "https://api.example.test";
const SECRET = "whsec_test_secret_0123456789abcdef";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** A Stripe event body with whitespace Stripe's compact JSON never has, so re-serialising differs. */
const BODY = `{
  "id": "evt_1Nq0ZaLkdIwHu7ixXYZ1abcd",
  "object": "event",
  "api_version": "2024-06-20",
  "created": 1767225600,
  "data": { "object": { "id": "pi_3Nq0Za", "object": "payment_intent", "amount": 2000 } },
  "livemode": false,
  "request": { "id": "req_8Kc2fQ1xJm5Ntw" },
  "type": "payment_intent.succeeded"
}`;

/** The expected signature, computed with node:crypto — independent of the app's code. */
function sign(body: string, ts: number, secret = SECRET): string {
  return createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
}

const nowSec = () => Math.floor(Date.now() / 1000);

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

function signed(body = BODY, ts = nowSec()): TriggerCall {
  return delivery(body, { "stripe-signature": `t=${ts},v1=${sign(body, ts)}` });
}

const STATE: TriggerState = {
  webhookId: "we_1",
  secret: SECRET,
  events: ["payment_intent.succeeded"],
};

function ingest(trigger: typeof paymentSucceeded, call: TriggerCall, state: Partial<TriggerState>) {
  return trigger.handleIngest!(
    { raw: call, params: {}, state: state as TriggerState, subscriptionId: "sub_abc" },
    mockCtx().ctx,
  );
}

test("fixture: the body is not canonical JSON, so re-serialising would break the signature", () => {
  assertEquals(JSON.stringify(JSON.parse(BODY)) !== BODY, true);
});

test("the app declares thirty-three webhook triggers, each with output and a sample", () => {
  const triggers = app.triggers ?? [];
  assertEquals(triggers.length, 33);
  for (const t of triggers) {
    assertEquals(typeof t.handleIngest, "function", t.key);
    assertEquals(typeof t.onSubscribe, "function", t.key);
    assertEquals(typeof t.onUnsubscribe, "function", t.key);
    assertEquals(typeof t.poll, "undefined", t.key);
    assertEquals((t.output?.length ?? 0) > 0, true, t.key);
    assertEquals(t.sample !== undefined, true, t.key);
  }
});

test("handleIngest: a valid signature over the exact bytes yields the normalized event", async () => {
  const out = evs(await ingest(paymentSucceeded, signed(), STATE));
  assertEquals(out.length, 1);
  assertEquals(out[0], {
    id: "evt_1Nq0ZaLkdIwHu7ixXYZ1abcd",
    type: "payment_intent.succeeded",
    created: 1767225600,
    livemode: false,
    account: null,
    apiVersion: "2024-06-20",
    requestId: "req_8Kc2fQ1xJm5Ntw",
    object: { id: "pi_3Nq0Za", object: "payment_intent", amount: 2000 },
    previousAttributes: null,
  });
});

test("handleIngest: a header case and extra schemes are tolerated; a second v1 may match (rolled secret)", async () => {
  const ts = nowSec();
  const call = delivery(BODY, {
    "Stripe-Signature": `t=${ts},v1=${sign(BODY, ts, "whsec_old")},v0=deadbeef,v1=${
      sign(BODY, ts)
    }`,
  });
  assertEquals(evs(await ingest(paymentSucceeded, call, STATE)).length, 1);
});

test("handleIngest: one flipped byte in the body throws", async () => {
  const ts = nowSec();
  const sig = sign(BODY, ts);
  const tampered = BODY.replace('"amount": 2000', '"amount": 2001');
  const call = delivery(tampered, { "stripe-signature": `t=${ts},v1=${sig}` });
  await assertRejects(async () => await ingest(paymentSucceeded, call, STATE));
});

test("handleIngest: a flipped byte in the signature throws", async () => {
  const ts = nowSec();
  const sig = sign(BODY, ts);
  const bad = (sig[0] === "0" ? "1" : "0") + sig.slice(1);
  const call = delivery(BODY, { "stripe-signature": `t=${ts},v1=${bad}` });
  await assertRejects(async () => await ingest(paymentSucceeded, call, STATE));
});

test("handleIngest: a signature made over re-serialised JSON is refused", async () => {
  const ts = nowSec();
  const compact = JSON.stringify(JSON.parse(BODY));
  const call = delivery(BODY, { "stripe-signature": `t=${ts},v1=${sign(compact, ts)}` });
  await assertRejects(async () => await ingest(paymentSucceeded, call, STATE));
});

test("handleIngest: a missing or malformed signature header throws", async () => {
  await assertRejects(async () => await ingest(paymentSucceeded, delivery(BODY, {}), STATE));
  await assertRejects(async () =>
    await ingest(paymentSucceeded, delivery(BODY, { "stripe-signature": "" }), STATE)
  );
  await assertRejects(async () =>
    await ingest(paymentSucceeded, delivery(BODY, { "stripe-signature": "nonsense" }), STATE)
  );
  // Only the fake v0 test scheme: not a live signature.
  const ts = nowSec();
  await assertRejects(async () =>
    await ingest(
      paymentSucceeded,
      delivery(BODY, { "stripe-signature": `t=${ts},v0=${sign(BODY, ts)}` }),
      STATE,
    )
  );
});

test("handleIngest: an absent rawBody throws (never falls back to the parsed body)", async () => {
  const ts = nowSec();
  const call = delivery(BODY, { "stripe-signature": `t=${ts},v1=${sign(BODY, ts)}` });
  delete call.rawBody;
  await assertRejects(async () => await ingest(paymentSucceeded, call, STATE), Error, "raw body");
});

test("handleIngest: a stale or future timestamp throws even with a correct signature", async () => {
  const now = nowSec();
  await assertRejects(
    async () => await ingest(paymentSucceeded, signed(BODY, now - 301 - 5), STATE),
    Error,
    "tolerance",
  );
  await assertRejects(
    async () => await ingest(paymentSucceeded, signed(BODY, now + 301 + 5), STATE),
    Error,
    "tolerance",
  );
  // Just inside the window is accepted.
  assertEquals(evs(await ingest(paymentSucceeded, signed(BODY, now - 200), STATE)).length, 1);
});

test("handleIngest: an unset or empty secret refuses, even with an absent or empty signature", async () => {
  for (const secret of [undefined, ""]) {
    const state = { webhookId: "we_1", secret, events: ["payment_intent.succeeded"] };
    await assertRejects(
      async () =>
        await ingest(paymentSucceeded, delivery(BODY, {}), state as Partial<TriggerState>),
      Error,
      "secret",
    );
    await assertRejects(
      async () =>
        await ingest(
          paymentSucceeded,
          delivery(BODY, { "stripe-signature": `t=${nowSec()},v1=` }),
          state as Partial<TriggerState>,
        ),
      Error,
      "secret",
    );
  }
  // No state at all (a delivery that beat the subscription's own registration).
  await assertRejects(
    async () =>
      await paymentSucceeded.handleIngest!(
        {
          raw: signed(),
          params: {},
          state: undefined as unknown as TriggerState,
          subscriptionId: "s",
        },
        mockCtx().ctx,
      ),
    Error,
    "secret",
  );
});

test("handleIngest: error text never echoes the secret, the signature or the header", async () => {
  const ts = nowSec();
  const sig = sign(BODY, ts, "whsec_other");
  const header = `t=${ts},v1=${sig}`;
  const messages: string[] = [];
  for (const call of [delivery(BODY, { "stripe-signature": header }), delivery(BODY, {})]) {
    try {
      await ingest(paymentSucceeded, call, STATE);
    } catch (err) {
      messages.push((err as Error).message);
    }
  }
  assertEquals(messages.length, 2);
  for (const m of messages) {
    assertEquals(m.includes(SECRET) || m.includes(sig) || m.includes(header), false);
  }
});

test("handleIngest: non-POST throws; an event outside the subscription is acknowledged with none", async () => {
  await assertRejects(
    async () => await ingest(paymentSucceeded, { ...signed(), method: "GET" }, STATE),
    Error,
    "POST",
  );
  const other = BODY.replace("payment_intent.succeeded", "charge.refunded");
  assertEquals(evs(await ingest(paymentSucceeded, signed(other), STATE)), []);
});

test("handleIngest: the generic trigger filters on its stored event list and accepts *", async () => {
  const state: TriggerState = { webhookId: "we_1", secret: SECRET, events: ["charge.refunded"] };
  assertEquals(evs(await ingest(genericEvent, signed(), state)), []);
  const any = { ...state, events: ["*"] };
  assertEquals(evs(await ingest(genericEvent, signed(), any)).length, 1);
});

test("handleIngest: a verified body that is not a Stripe event throws", async () => {
  await assertRejects(
    async () => await ingest(paymentSucceeded, signed('{ "hello": "world" }'), STATE),
    Error,
    "Not a Stripe event",
  );
});

test("parseSignatureHeader: keeps t and every v1, drops other schemes", () => {
  assertEquals(parseSignatureHeader("t=1492774577,v1=aa,v0=bb,v1=CC"), {
    t: "1492774577",
    v1: ["aa", "cc"],
  });
  assertEquals(parseSignatureHeader("v1=aa"), null);
  assertEquals(parseSignatureHeader("t=abc,v1=aa"), null);
});

function subscribe(
  trigger: typeof paymentSucceeded,
  params: Record<string, unknown>,
  ctx: HookContext,
) {
  return trigger.onSubscribe!(
    { params, subscriptionId: "sub_abc", callbackUrl: CALLBACK, hostUrl: HOST },
    ctx,
  ) as Promise<TriggerState>;
}

test("onSubscribe: lists, then creates the endpoint and keeps the returned secret", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: [{ id: "we_other", url: "https://elsewhere.test/x" }], has_more: false } },
    { body: { id: "we_new", secret: "whsec_from_stripe" } },
  ]);
  const state = await subscribe(paymentSucceeded, {}, ctx);
  assertEquals(state, {
    webhookId: "we_new",
    secret: "whsec_from_stripe",
    events: ["payment_intent.succeeded"],
  });
  assertEquals(calls.length, 2);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.stripe.com/v1/webhook_endpoints?limit=100");
  assertEquals(calls[1].method, "POST");
  assertEquals(calls[1].url, "https://api.stripe.com/v1/webhook_endpoints");
  assertEquals(
    calls[1].body,
    "url=https%3A%2F%2Fapi.example.test%2Ftriggers%2Fwebhooks%2Fsub_abc" +
      "&enabled_events%5B0%5D=payment_intent.succeeded" +
      "&api_version=2024-06-20&description=w6w%20trigger%20subscription",
  );
});

test("onSubscribe: deletes a leftover endpoint carrying this callback URL first", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: [{ id: "we_stale", url: CALLBACK }], has_more: false } },
    { body: { id: "we_stale", object: "webhook_endpoint", deleted: true } },
    { body: { id: "we_new", secret: "whsec_from_stripe" } },
  ]);
  await subscribe(paymentSucceeded, {}, ctx);
  assertEquals(calls[1].method, "DELETE");
  assertEquals(calls[1].url, "https://api.stripe.com/v1/webhook_endpoints/we_stale");
  assertEquals(calls[2].method, "POST");
});

test("onSubscribe: pages through the account's endpoints looking for leftovers", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: [{ id: "we_a", url: "https://x.test/a" }], has_more: true } },
    { body: { data: [{ id: "we_b", url: "https://x.test/b" }], has_more: false } },
    { body: { id: "we_new", secret: "whsec_s" } },
  ]);
  await subscribe(paymentSucceeded, {}, ctx);
  assertEquals(
    calls[1].url,
    "https://api.stripe.com/v1/webhook_endpoints?limit=100&starting_after=we_a",
  );
});

test("onSubscribe: the generic trigger registers the listed event types", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: [], has_more: false } },
    { body: { id: "we_new", secret: "whsec_s" } },
  ]);
  const state = await subscribe(
    genericEvent,
    { events: " charge.dispute.created, payout.paid ,," },
    ctx,
  );
  assertEquals(state.events, ["charge.dispute.created", "payout.paid"]);
  assertEquals(
    calls[1].body?.includes(
      "enabled_events%5B0%5D=charge.dispute.created&enabled_events%5B1%5D=payout.paid",
    ),
    true,
  );
  await assertRejects(
    async () => await subscribe(genericEvent, { events: " , " }, mockCtx().ctx),
    Error,
    "at least one",
  );
});

test("onSubscribe: a response without a secret deletes the endpoint and fails", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: [], has_more: false } },
    { body: { id: "we_new" } },
    { body: { id: "we_new", deleted: true } },
  ]);
  await assertRejects(
    async () => await subscribe(paymentSucceeded, {}, ctx),
    Error,
    "signing secret",
  );
  assertEquals(calls[2].method, "DELETE");
  assertEquals(calls[2].url, "https://api.stripe.com/v1/webhook_endpoints/we_new");
});

test("onUnsubscribe: deletes the endpoint; 404 and 410 mean already gone; other errors surface", async () => {
  const run = (ctx: HookContext) =>
    paymentSucceeded.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "sub_abc" }, ctx);
  const ok = mockCtx([{ body: { id: "we_1", deleted: true } }]);
  await run(ok.ctx);
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(ok.calls[0].url, "https://api.stripe.com/v1/webhook_endpoints/we_1");
  for (const status of [404, 410]) {
    await run(mockCtx([{ status, body: { error: { message: "No such webhook endpoint" } } }]).ctx);
  }
  await assertRejects(
    async () => await run(mockCtx([{ status: 500, body: { error: { message: "boom" } } }]).ctx),
    Error,
    "500",
  );
  const none = mockCtx();
  await paymentSucceeded.onUnsubscribe!(
    { params: {}, state: undefined as unknown as TriggerState, subscriptionId: "s" },
    none.ctx,
  );
  assertEquals(none.calls.length, 0);
});
