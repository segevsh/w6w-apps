import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import trigger from "../../triggers/event-received.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-channel-secret-0123456789abcdef";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Independent of app code: node:crypto, base64 HMAC-SHA256 of the exact body.
const sign = (body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(body).digest("base64");

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const BODY = `{ "destination" : "Ubot0000000000000000000000000000",
  "events":[
    { "type":"message", "mode":"active", "timestamp":1762683400123, "webhookEventId":"01A",
      "deliveryContext":{ "isRedelivery":true }, "replyToken":"rt1",
      "source":{ "type":"group", "groupId":"Cgroup1", "userId":"Uuser1" },
      "message":{ "id":"m1", "type":"text", "text":"hello \\n world" } },
    { "type":"follow", "timestamp":1762683400456, "webhookEventId":"01B", "replyToken":"rt2",
      "source":{ "type":"user", "userId":"Uuser2" }, "deliveryContext":{ "isRedelivery":false } },
    { "type":"unfollow", "timestamp":1762683400789, "webhookEventId":"01C",
      "source":{ "type":"user", "userId":"Uuser3" } },
    { "type":"postback", "timestamp":1762683401012, "webhookEventId":"01D", "replyToken":"rt4",
      "source":{ "type":"user", "userId":"Uuser4" },
      "postback":{ "data":"action=buy", "params":{ } } },
    { "type":"message", "timestamp":1762683401500, "webhookEventId":"01E", "replyToken":"rt5",
      "source":{ "type":"user", "userId":"Uuser5" },
      "message":{ "id":"m2", "type":"sticker" } }
  ] }`;

const call = (
  body: string | null,
  over: { headers?: Record<string, string>; method?: string; omitRaw?: boolean } = {},
  secret: string | null = SECRET,
  eventTypes?: string,
) => ({
  raw: {
    method: over.method ?? "POST",
    path: "/",
    query: {},
    headers: over.headers ?? (body === null ? {} : { "x-line-signature": sign(body) }),
    body: body === null ? null : JSON.parse(body),
    ...(body === null || over.omitRaw ? {} : { rawBody: body }),
  },
  params: { signingSecret: secret === null ? undefined : secret, eventTypes },
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

type Ingest = (typeof trigger)["handleIngest"];
const run = (t: { handleIngest?: Ingest }, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);
const types = (r: unknown) => (evs(r) as Array<{ type: string }>).map((e) => e.type);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares the webhook trigger with output and sample, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key), ["event-received"]);
  assert(trigger.output!.length > 0);
  assert(trigger.sample !== undefined);
  assertEquals(trigger.poll, undefined);
  assertEquals(typeof trigger.onSubscribe, "function");
  assertEquals(typeof trigger.onUnsubscribe, "function");
  assertEquals(trigger.params!.find((p) => p.key === "signingSecret")!.type, "secret");
});

test("valid signature over a non-canonical body → the four default types, in order", async () => {
  const out = evs(await run(trigger, call(BODY))) as Array<Record<string, unknown>>;
  assertEquals(out.map((e) => e.webhookEventId), ["01A", "01B", "01C", "01D", "01E"]);
  assertEquals(types(out), ["message", "follow", "unfollow", "postback", "message"]);
  assertEquals(out[0].destination, "Ubot0000000000000000000000000000");
});

test("eventTypes narrows the runs; an unlisted type is acknowledged without one", async () => {
  assertEquals(types(await run(trigger, call(BODY, {}, SECRET, "follow"))), ["follow"]);
  assertEquals(types(await run(trigger, call(BODY, {}, SECRET, " postback , unfollow "))), [
    "unfollow",
    "postback",
  ]);
  assertEquals(types(await run(trigger, call(BODY, {}, SECRET, "memberJoined"))), []);
});

test("a malformed eventTypes entry throws", async () => {
  await assertRejects(
    () => run(trigger, call(BODY, {}, SECRET, "message; drop")),
    Error,
    "Event types",
  );
});

test("one flipped byte in the body → throws", async () => {
  const flipped = BODY.replace("hello", "hellp");
  const input = call(flipped, { headers: { "x-line-signature": sign(BODY) } });
  await assertRejects(() => run(trigger, input), Error, "signature does not match");
});

test("signature header missing → throws", async () => {
  await assertRejects(() => run(trigger, call(BODY, { headers: {} })), Error, "x-line-signature");
});

test("rawBody absent → throws", async () => {
  await assertRejects(() => run(trigger, call(BODY, { omitRaw: true })), Error, "raw body");
});

test("unset or empty secret → refused before any compare", async () => {
  await assertRejects(() => run(trigger, call(BODY, {}, null)), Error, "secret");
  await assertRejects(() => run(trigger, call(BODY, {}, "")), Error, "secret");
  // an empty secret met by an empty header must not verify
  await assertRejects(
    () => run(trigger, call(BODY, { headers: { "x-line-signature": "" } }, "")),
    Error,
    "secret",
  );
});

test("signature made with another secret → throws", async () => {
  const input = call(BODY, { headers: { "x-line-signature": sign(BODY, "other-secret") } });
  await assertRejects(() => run(trigger, input), Error, "signature does not match");
});

test("a hex (not base64) signature of the same body is refused", async () => {
  const hex = createHmac("sha256", SECRET).update(BODY).digest("hex");
  await assertRejects(
    () => run(trigger, call(BODY, { headers: { "x-line-signature": hex } })),
    Error,
    "signature does not match",
  );
});

test("the Console 'Verify' delivery (empty events) is acknowledged without a run", async () => {
  const body = '{ "destination" : "Ubot0000000000000000000000000000", "events" : [ ] }';
  assertEquals(evs(await run(trigger, call(body))), []);
});

test("a signed body that is not a LINE delivery or not JSON throws", async () => {
  await assertRejects(() => run(trigger, call('{ "hello" : 1 }')), Error, "events");
  const notJson = "not json at all";
  const input = {
    ...call('{"x":1}'),
    raw: {
      ...call('{"x":1}').raw,
      rawBody: notJson,
      headers: { "x-line-signature": sign(notJson) },
    },
  };
  await assertRejects(() => run(trigger, input), Error, "not JSON");
});

test("a GET is refused", async () => {
  await assertRejects(() => run(trigger, call(BODY, { method: "GET" })), Error, "POST");
});

test("errors never echo the secret, the signature or the body", async () => {
  const bad = sign(BODY, "other-secret");
  try {
    await run(trigger, call(BODY, { headers: { "x-line-signature": bad } }));
    assert(false, "should have thrown");
  } catch (e) {
    const m = (e as Error).message;
    assert(
      !m.includes(SECRET) && !m.includes(bad) && !m.includes(sign(BODY)) && !m.includes("hello"),
    );
  }
});

test("event normalisation: group source, redelivery flag, message object", async () => {
  const [e] = evs(await run(trigger, call(BODY))) as Array<Record<string, unknown>>;
  assertEquals(e.sourceType, "group");
  assertEquals(e.groupId, "Cgroup1");
  assertEquals(e.userId, "Uuser1");
  assertEquals(e.isRedelivery, true);
  assertEquals(e.replyToken, "rt1");
  assertEquals((e.message as Record<string, unknown>).text, "hello \n world");
  assertEquals(e.timestamp, 1762683400123);
});

test("onSubscribe hands back the callback URL and makes no vendor call", async () => {
  const { ctx, calls } = mockCtx([]);
  const state = await trigger.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  assertEquals(calls.length, 0);
  await trigger.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
  assertEquals(calls.length, 0);
});
