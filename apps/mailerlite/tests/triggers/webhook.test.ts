import { test } from "node:test";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newSubscriber from "../../triggers/new-subscriber.ts";
import subscriberUpdated from "../../triggers/subscriber-updated.ts";
import subscriberUnsubscribed from "../../triggers/subscriber-unsubscribed.ts";
import campaignSent from "../../triggers/campaign-sent.ts";

const SECRET = "4jQ3Y4UlLI";
const STATE = { webhookId: "68074372004316503", event: "subscriber.created", secret: SECRET };

/** Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY. */
const BODY =
  '{ "id": "100000000000000000",  "email": "john.doe@example.com",\n  "status": "active", "fields": { "name": "John" },  "event": "subscriber.created", "account_id": 0 }';

/** Narrow the `E[] | { events, response? }` union (brief §3). */
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** Expected signature, computed independently of the app: hex(HMAC-SHA256(secret, body)). */
const sign = (body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(body).digest("hex");

function call(
  headers: Record<string, string>,
  rawBody: string | null = BODY,
  method = "POST",
): TriggerCall {
  const raw: TriggerCall = { method, path: "/hook", query: {}, headers, body: null };
  if (rawBody !== null) {
    raw.rawBody = rawBody;
    raw.body = JSON.parse(rawBody);
  }
  return raw;
}

async function ingest(raw: TriggerCall, state: unknown = STATE, trigger = newSubscriber) {
  const { ctx } = mockCtx();
  return await trigger.handleIngest!(
    { raw, params: {}, state: state as typeof STATE, subscriptionId: "sub-1" },
    ctx,
  );
}

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("handleIngest: a valid signature over the exact bytes yields the event", async () => {
  const out = evs(await ingest(call({ signature: sign(BODY) })));
  assertEquals(out, [{
    event: "subscriber.created",
    resourceId: "100000000000000000",
    resource: JSON.parse(BODY),
  }]);
});

test("handleIngest: an upper-case hex signature verifies too", async () => {
  const out = evs(await ingest(call({ Signature: sign(BODY).toUpperCase() })));
  assertEquals(out.length, 1);
});

test("handleIngest: a one-byte change to the body throws", async () => {
  const headers = { signature: sign(BODY) };
  await assertRejects(
    () => ingest(call(headers, BODY.replace("active", "activf"))),
    Error,
    "refused",
  );
});

test("handleIngest: a flipped signature byte throws without echoing it", async () => {
  const good = sign(BODY);
  const bad = (good[0] === "a" ? "b" : "a") + good.slice(1);
  const err = await assertRejects(() => ingest(call({ signature: bad })));
  assert(err.message.includes("refused"));
  assert(!err.message.includes(bad) && !err.message.includes(SECRET));
});

test("handleIngest: a signature made with another secret throws", async () => {
  await assertRejects(
    () => ingest(call({ signature: sign(BODY, "another-secret") })),
    Error,
    "refused",
  );
});

test("handleIngest: a signature over the re-serialised body does not verify", async () => {
  const reserialised = JSON.stringify(JSON.parse(BODY));
  await assertRejects(() => ingest(call({ signature: sign(reserialised) })), Error, "refused");
});

test("handleIngest: a missing or empty signature header throws", async () => {
  await assertRejects(() => ingest(call({})), Error, "refused");
  await assertRejects(() => ingest(call({ signature: "" })), Error, "refused");
});

test("handleIngest: an absent rawBody throws", async () => {
  await assertRejects(() => ingest(call({ signature: sign(BODY) }, null)), Error, "raw body");
});

test("handleIngest: an unset or empty secret refuses even with an absent or empty header", async () => {
  for (const state of [null, {}, { ...STATE, secret: "" }]) {
    for (const raw of [call({}), call({ signature: "" }), call({ signature: sign(BODY) })]) {
      await assertRejects(() => ingest(raw, state), Error, "secret");
    }
  }
});

test("handleIngest: a non-POST delivery throws", async () => {
  await assertRejects(() => ingest(call({ signature: sign(BODY) }, null, "GET")), Error, "POST");
});

test("handleIngest: a verified delivery of another event is acknowledged, not emitted", async () => {
  assertEquals(evs(await ingest(call({ signature: sign(BODY) }), STATE, subscriberUpdated)), []);
});

test("handleIngest: a verified body that is not JSON throws a body error", async () => {
  const body = "not json {";
  const raw: TriggerCall = {
    method: "POST",
    path: "/hook",
    query: {},
    headers: { signature: sign(body) },
    body,
    rawBody: body,
  };
  await assertRejects(() => ingest(raw), Error, "not valid JSON");
});

test("triggers: each declares output, sample and webhook hooks", () => {
  for (const t of [newSubscriber, subscriberUpdated, subscriberUnsubscribed, campaignSent]) {
    assert((t.output as unknown[]).length > 0, `${t.key} output`);
    assert(t.sample !== undefined, `${t.key} sample`);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
    assertEquals(typeof t.handleIngest, "function");
    assertEquals(t.poll, undefined);
  }
});

const subscribeInput = {
  params: {},
  subscriptionId: "sub-1",
  callbackUrl: "https://w6w.example/hook/abc",
  hostUrl: "https://w6w.example",
};

test("onSubscribe: creates the webhook and keeps the secret MailerLite returns", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: [], meta: { last_page: 1 } } },
    { status: 200, body: { data: { id: "68074372004316503", secret: SECRET, enabled: true } } },
  ]);
  const state = await newSubscriber.onSubscribe!(subscribeInput, ctx);
  assertEquals(state, {
    webhookId: "68074372004316503",
    event: "subscriber.created",
    secret: SECRET,
  });
  assertEquals(calls.length, 2);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://connect.mailerlite.com/api/webhooks?page=1");
  assertEquals(calls[1].method, "POST");
  assertEquals(calls[1].url, "https://connect.mailerlite.com/api/webhooks");
  assertEquals(JSON.parse(calls[1].body!), {
    name: "w6w sub-1",
    events: ["subscriber.created"],
    url: "https://w6w.example/hook/abc",
    enabled: true,
  });
});

test("onSubscribe: each trigger subscribes to its own event", async () => {
  const expected: Array<[typeof newSubscriber, string]> = [
    [subscriberUpdated, "subscriber.updated"],
    [subscriberUnsubscribed, "subscriber.unsubscribed"],
    [campaignSent, "campaign.sent"],
  ];
  for (const [t, event] of expected) {
    const { ctx, calls } = mockCtx([
      { body: { data: [] } },
      { body: { data: { id: "1", secret: SECRET } } },
    ]);
    await t.onSubscribe!(subscribeInput, ctx);
    assertEquals(JSON.parse(calls[1].body!).events, [event]);
  }
});

test("onSubscribe: deletes a leftover webhook that already points at the callback URL", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        data: [
          { id: "OLD1", url: "https://w6w.example/hook/abc" },
          { id: "OTHER", url: "https://elsewhere.example/h" },
        ],
        meta: { last_page: 1 },
      },
    },
    { status: 204 },
    { body: { data: { id: "NEW1", secret: SECRET } } },
  ]);
  await newSubscriber.onSubscribe!(subscribeInput, ctx);
  assertEquals(calls[1].method, "DELETE");
  assertEquals(calls[1].url, "https://connect.mailerlite.com/api/webhooks/OLD1");
  assertEquals(calls.filter((c) => c.method === "DELETE").length, 1);
});

test("onSubscribe: reads every page of existing webhooks while looking for a leftover", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: [{ id: "A", url: "https://x.example" }], meta: { last_page: 2 } } },
    { body: { data: [{ id: "B", url: "https://w6w.example/hook/abc" }], meta: { last_page: 2 } } },
    { status: 204 },
    { body: { data: { id: "NEW1", secret: SECRET } } },
  ]);
  await newSubscriber.onSubscribe!(subscribeInput, ctx);
  assertEquals(calls[1].url, "https://connect.mailerlite.com/api/webhooks?page=2");
  assertEquals(calls[2].url, "https://connect.mailerlite.com/api/webhooks/B");
});

test("onSubscribe: a response without a secret removes the webhook it just created", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: [] } },
    { body: { data: { id: "NEW1" } } },
    { status: 204 },
  ]);
  await assertRejects(
    () => newSubscriber.onSubscribe!(subscribeInput, ctx),
    Error,
    "signing secret",
  );
  assertEquals(calls[2].method, "DELETE");
  assertEquals(calls[2].url, "https://connect.mailerlite.com/api/webhooks/NEW1");
});

test("onUnsubscribe: deletes the webhook; 404 and 410 count as already gone", async () => {
  for (const status of [204, 404, 410]) {
    const { ctx, calls } = mockCtx([{ status, body: status === 204 ? undefined : "gone" }]);
    await newSubscriber.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, ctx);
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, "DELETE");
    assertEquals(calls[0].url, "https://connect.mailerlite.com/api/webhooks/68074372004316503");
  }
});

test("onUnsubscribe: any other failure propagates; no state means no call", async () => {
  const failing = mockCtx([{ status: 500, body: "boom" }]);
  await assertRejects(
    () =>
      newSubscriber.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, failing.ctx),
    Error,
    "500",
  );
  const idle = mockCtx();
  await newSubscriber.onUnsubscribe!(
    { params: {}, state: undefined as unknown as typeof STATE, subscriptionId: "s" },
    idle.ctx,
  );
  assertEquals(idle.calls.length, 0);
});
