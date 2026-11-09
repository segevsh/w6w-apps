import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import newMessage from "../../triggers/new-message.ts";
import newMembership from "../../triggers/new-membership.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const SECRET = "0123456789abcdef0123456789abcdef";
const STATE = {
  webhookId: "WH1",
  secret: SECRET,
  resource: "messages",
  event: "created",
  personId: "ME",
};
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "id": "WH1",  "name": "w6w", "resource": "messages", "event": "created",
  "orgId": "ORG", "createdBy": "P1", "appId": "A1", "ownedBy": "creator", "status": "active",
  "created": "2026-01-01T12:00:00.000Z", "actorId": "ACTOR",
  "data": { "id": "MSG1", "roomId": "ROOM1", "personId": "ACTOR", "personEmail": "a@example.com" } }`;

const sign = (body: string, secret = SECRET) =>
  createHmac("sha1", secret).update(body).digest("hex");

function call(body: string | undefined, headers: Record<string, string>): TriggerCall {
  return {
    method: "POST",
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers,
    body: body === undefined ? null : JSON.parse(body),
    ...(body === undefined ? {} : { rawBody: body }),
  };
}
const signed = (body = BODY) => call(body, { "x-spark-signature": sign(body) });

function ingest(
  t: typeof newMessage,
  raw: TriggerCall,
  state: unknown = STATE,
  params: Record<string, unknown> = {},
) {
  return Promise.resolve().then(() =>
    t.handleIngest!({ raw, params, state: state as never, subscriptionId: "sub_1" }, mockCtx().ctx)
  );
}

test("fixture: the body is not canonical JSON", () => {
  assert.notEqual(JSON.stringify(JSON.parse(BODY)), BODY);
});

test("app: declares both triggers with output and sample", () => {
  assert.deepEqual(app.triggers.map((t) => t.key), ["new-message", "new-membership"]);
  for (const t of app.triggers) {
    assert.ok(t.output.length > 0);
    assert.notEqual(t.sample, undefined);
  }
});

test("onSubscribe: cleans leftovers on our URL, reads /people/me, creates the webhook with a random secret", async () => {
  const m = mockCtx([
    {
      body: {
        items: [{ id: "OLD", targetUrl: CALLBACK }, {
          id: "OTHER",
          targetUrl: "https://x.example/h",
        }],
      },
    },
    { status: 204 },
    { body: { id: "ME", displayName: "Bot" } },
    { body: { id: "WH1", secret: "echoed" } },
  ]);
  const state = await newMessage.onSubscribe!(
    { params: { roomId: " ROOM1 " }, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "h" },
    m.ctx,
  ) as typeof STATE;
  assert.deepEqual(m.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://webexapis.com/v1/webhooks?max=100"],
    ["DELETE", "https://webexapis.com/v1/webhooks/OLD"],
    ["GET", "https://webexapis.com/v1/people/me"],
    ["POST", "https://webexapis.com/v1/webhooks"],
  ]);
  const sent = JSON.parse(m.calls[3].body!);
  assert.deepEqual(Object.keys(sent).sort(), [
    "event",
    "filter",
    "name",
    "resource",
    "secret",
    "targetUrl",
  ]);
  assert.deepEqual(
    [sent.targetUrl, sent.resource, sent.event, sent.filter, sent.name],
    [CALLBACK, "messages", "created", "roomId=ROOM1", "w6w sub_1"],
  );
  assert.match(sent.secret, /^[0-9a-f]{64}$/);
  assert.deepEqual(state, {
    webhookId: "WH1",
    secret: sent.secret,
    resource: "messages",
    event: "created",
    personId: "ME",
  });
});

test("onSubscribe (memberships): no /people/me call, no filter without a room", async () => {
  const m = mockCtx([{ body: { items: [] } }, { body: { id: "WH2" } }]);
  const state = await newMembership.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "h" },
    m.ctx,
  ) as typeof STATE;
  assert.equal(m.calls.length, 2);
  const sent = JSON.parse(m.calls[1].body!);
  assert.deepEqual([sent.resource, sent.event, "filter" in sent], [
    "memberships",
    "created",
    false,
  ]);
  assert.equal(state.personId, null);
});

test("onUnsubscribe: DELETE the webhook; 404 and 410 are already gone; other errors propagate", async () => {
  const ok = mockCtx([{ status: 204 }]);
  await newMessage.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, ok.ctx);
  assert.deepEqual([ok.calls[0].method, ok.calls[0].url], [
    "DELETE",
    "https://webexapis.com/v1/webhooks/WH1",
  ]);
  for (const status of [404, 410]) {
    const m = mockCtx([{ status, body: { message: "gone" } }]);
    await newMessage.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, m.ctx);
  }
  const bad = mockCtx([{ status: 500, body: { message: "boom" } }]);
  await assert.rejects(
    newMessage.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, bad.ctx),
    /Webex 500/,
  );
  const none = mockCtx();
  await newMessage.onUnsubscribe!({ params: {}, state: {}, subscriptionId: "s" }, none.ctx);
  assert.equal(none.calls.length, 0);
});

test("valid hex HMAC-SHA1 over the raw body -> one event", async () => {
  const [e] = evs(await ingest(newMessage, signed())) as Array<Record<string, unknown>>;
  assert.deepEqual(
    [e.webhookId, e.resource, e.event, e.id, e.roomId, e.personEmail, e.actorId],
    ["WH1", "messages", "created", "MSG1", "ROOM1", "a@example.com", "ACTOR"],
  );
});

test("header name and hex case are tolerated", async () => {
  const raw = call(BODY, { "X-Spark-Signature": sign(BODY).toUpperCase() });
  assert.equal(evs(await ingest(newMessage, raw)).length, 1);
});

test("one flipped byte -> refused; signature over re-serialised JSON -> refused", async () => {
  await assert.rejects(
    ingest(newMessage, call(BODY.replace("MSG1", "MSG2"), { "x-spark-signature": sign(BODY) })),
    /does not match/,
  );
  await assert.rejects(
    ingest(newMessage, call(BODY, { "x-spark-signature": sign(JSON.stringify(JSON.parse(BODY))) })),
    /does not match/,
  );
});

test("wrong secret, header missing or empty -> refused", async () => {
  await assert.rejects(
    ingest(newMessage, call(BODY, { "x-spark-signature": sign(BODY, "other") })),
    /does not match/,
  );
  await assert.rejects(ingest(newMessage, call(BODY, {})), /signature header is missing/);
  await assert.rejects(
    ingest(newMessage, call(BODY, { "x-spark-signature": "" })),
    /signature header is missing/,
  );
});

test("rawBody absent -> refused", async () => {
  await assert.rejects(
    ingest(newMessage, call(undefined, { "x-spark-signature": sign(BODY) })),
    /raw body/,
  );
});

test("unset or empty stored secret refuses, even with an absent header", async () => {
  for (const state of [null, {}, { ...STATE, secret: "" }, { ...STATE, secret: undefined }]) {
    await assert.rejects(ingest(newMessage, call(BODY, {}), state), /not configured/);
    await assert.rejects(ingest(newMessage, signed(), state), /not configured/);
    // Signed with the empty key, which hmac() itself rejects: still no event.
    await assert.rejects(
      ingest(
        newMessage,
        call(BODY, { "x-spark-signature": createHmac("sha1", "").update(BODY).digest("hex") }),
        state,
      ),
      /not configured/,
    );
  }
});

test("errors never contain the secret or the signature", async () => {
  const bad = "ab".repeat(20);
  const msg = await ingest(newMessage, call(BODY, { "x-spark-signature": bad })).then(
    () => "",
    (e: Error) => e.message,
  );
  assert.ok(msg.length > 0);
  for (const leak of [SECRET, bad]) assert.equal(msg.includes(leak), false);
});

test("a delivery for another resource or event is acknowledged without an event", async () => {
  const other = BODY.replace('"resource": "messages"', '"resource": "rooms"');
  assert.deepEqual(evs(await ingest(newMessage, signed(other))), []);
  assert.deepEqual(evs(await ingest(newMembership, signed())), []);
});

test("own messages are skipped unless includeOwnMessages; room filter narrows", async () => {
  const own = BODY.replace('"actorId": "ACTOR"', '"actorId": "ME"');
  assert.deepEqual(evs(await ingest(newMessage, signed(own))), []);
  assert.equal(
    evs(await ingest(newMessage, signed(own), STATE, { includeOwnMessages: true })).length,
    1,
  );
  assert.deepEqual(evs(await ingest(newMessage, signed(), STATE, { roomId: "ROOM2" })), []);
  assert.equal(evs(await ingest(newMessage, signed(), STATE, { roomId: "ROOM1" })).length, 1);
});

test("parseOutput: fetches the message text; a message the connection cannot read gives null", async () => {
  const [e] = evs(await ingest(newMessage, signed())) as unknown[];
  const m = mockCtx([{ body: { id: "MSG1", text: "hi there" } }]);
  const out = await newMessage.parseOutput!({
    call: {},
    normalized: e as never,
    subscriptionId: "s",
  }, m.ctx) as { text: string; message: { id: string } };
  assert.deepEqual([m.calls[0].method, m.calls[0].url], [
    "GET",
    "https://webexapis.com/v1/messages/MSG1",
  ]);
  assert.deepEqual([out.text, out.message.id], ["hi there", "MSG1"]);
  const gone = mockCtx([{ status: 404, body: { message: "nf" } }]);
  const out2 = await newMessage.parseOutput!({
    call: {},
    normalized: e as never,
    subscriptionId: "s",
  }, gone.ctx) as { text: unknown; message: unknown };
  assert.deepEqual([out2.text, out2.message], [null, null]);
});
