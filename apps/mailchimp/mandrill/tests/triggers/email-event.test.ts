import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import trigger from "../../triggers/email-event.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const KEY = "test-webhook-auth-key-0123456789";
const URL_ = "https://api.example.test/triggers/webhooks/sub_1?x=1&y=a%20b";
const API = "https://mandrillapp.com/api/1.0";

// Mandrill signs: URL + each POST variable name and value (sorted by name), HMAC-SHA1, base64.
const sign = (url: string, vars: Record<string, string>, key = KEY) => {
  const text = url + Object.keys(vars).sort().map((k) => k + vars[k]).join("");
  return createHmac("sha1", key).update(text).digest("base64");
};

// Non-canonical whitespace inside the events value; the form body is percent-encoded.
const EVENTS =
  `[ { "event" : "click",  "ts": 1762770600, "_id":"abc123", "url":"https://x.test/a b",
  "msg": { "email":"ada@example.com", "subject":"Hi",  "sender":"me@example.com", "state":"sent",
  "tags":["welcome"], "metadata": {"user_id": 111}, "_id":"abc123" } },
  { "event":"open", "ts": 1762770601, "msg": { "email":"bob@example.com" } },
  { "type":"blacklist", "action":"add", "ts": 1762770602 } ]`;
const formOf = (events: string) => new URLSearchParams({ mandrill_events: events }).toString();

const call = (
  rawBody: string | null,
  headers: Record<string, string>,
  state: Record<string, unknown> | null = { webhookId: 7, authKey: KEY, url: URL_ },
  events?: string,
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers,
    body: rawBody === null ? null : Object.fromEntries(new URLSearchParams(rawBody)),
    ...(rawBody === null ? {} : { rawBody }),
  },
  params: { events },
  state: state ?? {},
  subscriptionId: "sub_1",
});

const signedHeaders = (events = EVENTS, key = KEY, url = URL_) => ({
  "x-mandrill-signature": sign(url, { mandrill_events: events }, key),
});

const ingest = (input: ReturnType<typeof call>) =>
  trigger.handleIngest!(input as never, mockCtx().ctx);

async function refused(fn: () => Promise<unknown>, includes: string) {
  try {
    await fn();
  } catch (err) {
    assert(err instanceof Error && err.message.includes(includes), `message: ${String(err)}`);
    return;
  }
  throw new Error("expected the delivery to be refused");
}

test("fixture has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(EVENTS)) !== EVENTS);
});

test("app declares the webhook trigger with output and sample, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key), ["email-event"]);
  assert(trigger.output!.length > 0);
  assert(trigger.sample !== undefined);
  assertEquals(trigger.poll, undefined);
  assertEquals(typeof trigger.onSubscribe, "function");
  assertEquals(typeof trigger.onUnsubscribe, "function");
});

test("onSubscribe: POST webhooks/add with the literal body, stores id, key and url", async () => {
  const m = mockCtx([{ body: { id: 7, auth_key: KEY, url: URL_ } }]);
  const state = await trigger.onSubscribe!(
    { params: { events: "open, click" }, callbackUrl: URL_, subscriptionId: "sub_1" } as never,
    m.ctx,
  );
  assertEquals(state, { webhookId: 7, authKey: KEY, url: URL_ });
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "POST");
  assertEquals(m.calls[0].url, `${API}/webhooks/add.json`);
  assertEquals(JSON.parse(m.calls[0].body!), {
    url: URL_,
    description: "w6w trigger sub_1",
    events: ["open", "click"],
  });
  const dflt = mockCtx([{ body: { id: 8, auth_key: KEY } }]);
  await trigger.onSubscribe!(
    { params: {}, callbackUrl: URL_, subscriptionId: "sub_2" } as never,
    dflt.ctx,
  );
  assertEquals(JSON.parse(dflt.calls[0].body!).events, [
    "send",
    "hard_bounce",
    "soft_bounce",
    "open",
    "click",
    "reject",
  ]);
});

test("onSubscribe: an unknown event is refused before any request; no key rolls back", async () => {
  const none = mockCtx([]);
  await refused(
    () =>
      trigger.onSubscribe!(
        { params: { events: "open,nope" }, callbackUrl: URL_, subscriptionId: "s" } as never,
        none.ctx,
      ),
    "nope",
  );
  assertEquals(none.calls.length, 0);
  const m = mockCtx([{ body: { id: 9 } }, { body: {} }]);
  await refused(
    () =>
      trigger.onSubscribe!({ params: {}, callbackUrl: URL_, subscriptionId: "s" } as never, m.ctx),
    "signing key",
  );
  assertEquals(m.calls.length, 2);
  assertEquals(m.calls[1].url, `${API}/webhooks/delete.json`);
  assertEquals(JSON.parse(m.calls[1].body!), { id: 9 });
});

test("onUnsubscribe: POST webhooks/delete; unknown webhook = gone, other errors throw", async () => {
  const ok = mockCtx([{ body: {} }]);
  await trigger.onUnsubscribe!(
    { state: { webhookId: 7, authKey: KEY, url: URL_ }, subscriptionId: "sub_1" } as never,
    ok.ctx,
  );
  assertEquals(ok.calls[0].url, `${API}/webhooks/delete.json`);
  assertEquals(JSON.parse(ok.calls[0].body!), { id: 7 });

  const gone = mockCtx([{
    status: 404,
    body: { status: "error", name: "Unknown_Webhook", message: "Unknown webhook" },
  }]);
  await trigger.onUnsubscribe!(
    { state: { webhookId: 7, authKey: KEY, url: URL_ }, subscriptionId: "s" } as never,
    gone.ctx,
  );
  const boom = mockCtx([{ status: 500, body: { status: "error", message: "boom" } }]);
  await refused(
    () =>
      trigger.onUnsubscribe!(
        { state: { webhookId: 7, authKey: KEY, url: URL_ }, subscriptionId: "s" } as never,
        boom.ctx,
      ),
    "Mandrill 500",
  );
});

test("valid signature (node:crypto) → message events only, one per batch item", async () => {
  const out = evs(await ingest(call(formOf(EVENTS), signedHeaders()))) as Array<
    Record<string, unknown>
  >;
  assertEquals(out.length, 2); // the blacklist sync item is not a message event
  assertEquals(out[0].event, "click");
  assertEquals(out[0].messageId, "abc123");
  assertEquals(out[0].email, "ada@example.com");
  assertEquals(out[0].url, "https://x.test/a b");
  assertEquals(out[0].tags, ["welcome"]);
  assertEquals(out[0].metadata, { user_id: 111 });
  assertEquals(out[1].event, "open");
});

test("the events filter narrows the batch", async () => {
  const out = evs(await ingest(call(formOf(EVENTS), signedHeaders(), undefined, "open"))) as Array<
    Record<string, unknown>
  >;
  assertEquals(out.map((e) => e.event), ["open"]);
});

test("signature made with another key, or over another URL → refused", async () => {
  await refused(
    () => ingest(call(formOf(EVENTS), signedHeaders(EVENTS, "another-key-value-xxxxxxxxxxxxxxxx"))),
    "signature",
  );
  await refused(
    () => ingest(call(formOf(EVENTS), signedHeaders(EVENTS, KEY, "https://other.test/hook"))),
    "signature",
  );
});

test("one flipped byte in the batch → refused", async () => {
  const headers = signedHeaders();
  await refused(
    () => ingest(call(formOf(EVENTS.replace("abc123", "abc124")), headers)),
    "signature",
  );
});

test("one flipped byte in the signature → refused", async () => {
  const s = signedHeaders()["x-mandrill-signature"];
  await refused(
    () =>
      ingest(
        call(formOf(EVENTS), {
          "x-mandrill-signature": "A" + s.slice(1) === s ? "B" + s.slice(1) : "A" + s.slice(1),
        }),
      ),
    "signature",
  );
});

test("signature header missing → refused", async () => {
  await refused(() => ingest(call(formOf(EVENTS), {})), "missing");
});

test("rawBody absent → refused", async () => {
  await refused(() => ingest(call(null, signedHeaders())), "raw body");
});

test("unset or empty stored key → refused (a non-empty batch)", async () => {
  for (const state of [null, { webhookId: 7, authKey: "", url: URL_ }]) {
    await refused(() => ingest(call(formOf(EVENTS), signedHeaders(), state)), "secret");
  }
});

test("registration probe: an empty batch with no stored key is acknowledged with no event", async () => {
  const empty = formOf("[]");
  assertEquals(evs(await ingest(call(empty, { "x-mandrill-signature": "whatever" }, null))), []);
  // ... but not once a key is stored: an empty batch must then carry a valid signature too.
  await refused(() => ingest(call(empty, { "x-mandrill-signature": "whatever" })), "signature");
  // and a body that is not a Mandrill batch is never acknowledged on the probe path
  await refused(() => ingest(call("foo=bar", {}, null)), "secret");
});

test("a verified body that is not a batch is refused", async () => {
  const body = "foo=bar";
  await refused(
    () => ingest(call(body, { "x-mandrill-signature": sign(URL_, { foo: "bar" }) })),
    "mandrill_events",
  );
});

test("errors never contain the key, the signature or the body", async () => {
  const headers = signedHeaders(EVENTS, "another-key-value-xxxxxxxxxxxxxxxx");
  try {
    await ingest(call(formOf(EVENTS), headers));
    throw new Error("should have thrown");
  } catch (err) {
    const m = (err as Error).message;
    assert(!m.includes(KEY) && !m.includes(headers["x-mandrill-signature"]) && !m.includes("ada@"));
  }
});
