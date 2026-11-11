import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import incoming from "../../triggers/incoming-message.ts";
import status from "../../triggers/message-status.ts";

const URL_ = "https://api.example.test/triggers/webhooks/sub_1";
const TOKEN = "12345abcdef67890token";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Form body with percent-escapes and '+' spaces: re-encoding the parsed form would not reproduce it.
const BODY =
  "ToCountry=US&MessageSid=SM123&Body=Hello+World%21%20%C3%A9&From=%2B15558675310&To=%2B15017122661&NumMedia=1&MediaUrl0=https%3A%2F%2Fapi.twilio.com%2Fm%2F1&AccountSid=AC123";

// Independent of the app: sort by name, concatenate name+value (values here are all unique names).
function sign(url: string, body: string, token = TOKEN): string {
  const p = new URLSearchParams(body);
  const s = [...p.keys()].sort().map((k) => k + p.get(k)).join("");
  return createHmac("sha1", token).update(url + s).digest("base64");
}

function call(
  body: string | undefined,
  headers: Record<string, string>,
  method = "POST",
): TriggerCall {
  return {
    method,
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers,
    body: body === undefined ? null : Object.fromEntries(new URLSearchParams(body)),
    ...(body === undefined ? {} : { rawBody: body }),
  };
}

const signed = (body = BODY, url = URL_) => call(body, { "x-twilio-signature": sign(url, body) });

function ingest(
  t: typeof incoming,
  raw: TriggerCall,
  params: Record<string, unknown> = { authToken: TOKEN },
  state: unknown = { callbackUrl: URL_ },
) {
  return Promise.resolve().then(() =>
    t.handleIngest!({ raw, params, state: state as never, subscriptionId: "sub_1" }, mockCtx().ctx)
  );
}

test("app: declares both triggers with output and sample; auth token is a secret param", () => {
  // The message triggers lead; the call and Event Streams triggers are covered in events.test.ts.
  assert.deepEqual(app.triggers.map((t) => t.key).slice(0, 2), [
    "incoming-message",
    "message-status",
  ]);
  for (const t of app.triggers) {
    assert.ok(t.output.length > 0);
    assert.notEqual(t.sample, undefined);
    assert.equal(t.params!.find((p) => p.key === "authToken")!.type, "secret");
  }
});

test("onSubscribe makes no Twilio call and returns the exact callback URL", async () => {
  const m = mockCtx();
  const state = await incoming.onSubscribe!(
    { params: {}, subscriptionId: "s", callbackUrl: URL_, hostUrl: "https://api.example.test" },
    m.ctx,
  );
  assert.deepEqual(state, { callbackUrl: URL_ });
  assert.equal(m.calls.length, 0);
  await incoming.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, m.ctx);
});

test("known-answer vector from Twilio's documentation scheme", async () => {
  // https://www.twilio.com/docs/usage/security#validating-requests (URL + sorted name/value pairs).
  const url = "https://mycompany.com/myapp.php?foo=1&bar=2";
  const body =
    "CallSid=CA1234567890ABCDE&Caller=%2B14158675310&Digits=1234&From=%2B14158675310&To=%2B18005551212";
  const sig = "GvWf1cFY/Q7PnoempGyD5oXAezc=";
  const authToken = "12345";
  assert.equal(sign(url, body, authToken), sig);
  const raw = call(body, { "x-twilio-signature": sig });
  const out = evs(await ingest(status, raw, { authToken }, { callbackUrl: url }));
  assert.deepEqual(out, []); // verified, then ignored: it is neither a message nor a status callback
});

test("valid signature over the raw form body -> one incoming-message event", async () => {
  const out = evs(await ingest(incoming, signed())) as Array<Record<string, unknown>>;
  assert.equal(out.length, 1);
  assert.deepEqual(
    [out[0].messageSid, out[0].from, out[0].to, out[0].body, out[0].numMedia, out[0].mediaUrls],
    ["SM123", "+15558675310", "+15017122661", "Hello World! é", 1, ["https://api.twilio.com/m/1"]],
  );
});

test("header name matches case-insensitively", async () => {
  const raw = call(BODY, { "X-Twilio-Signature": sign(URL_, BODY) });
  assert.equal(evs(await ingest(incoming, raw)).length, 1);
});

test("one flipped byte in the body -> refused", async () => {
  const raw = call(BODY.replace("Hello", "Hallo"), { "x-twilio-signature": sign(URL_, BODY) });
  await assert.rejects(ingest(incoming, raw), /signature does not match/);
});

test("a different URL than the one registered -> refused", async () => {
  await assert.rejects(ingest(incoming, signed(BODY, URL_ + "x")), /signature does not match/);
  await assert.rejects(
    ingest(incoming, signed(), undefined, { callbackUrl: URL_ + "/other" }),
    /does not match/,
  );
});

test("wrong auth token -> refused", async () => {
  await assert.rejects(ingest(incoming, signed(), { authToken: "other" }), /does not match/);
});

test("signature header missing -> refused", async () => {
  await assert.rejects(ingest(incoming, call(BODY, {})), /signature header is missing/);
});

test("rawBody absent -> refused", async () => {
  await assert.rejects(
    ingest(incoming, call(undefined, { "x-twilio-signature": sign(URL_, BODY) })),
    /raw body/,
  );
});

test("no callback URL on record, or a non-POST delivery -> refused", async () => {
  await assert.rejects(ingest(incoming, signed(), undefined, {}), /no callback URL/);
  await assert.rejects(
    ingest(incoming, call(BODY, { "x-twilio-signature": sign(URL_, BODY) }, "GET")),
    /POST/,
  );
});

test("unset or empty auth token refuses, even with an absent header", async () => {
  for (const params of [{}, { authToken: "" }, { authToken: undefined }]) {
    await assert.rejects(ingest(incoming, call(BODY, {}), params), /not configured/);
    await assert.rejects(ingest(incoming, signed(), params), /not configured/);
  }
});

test("a JSON body cannot satisfy the form scheme -> refused", async () => {
  const json = '{ "MessageSid": "SM1" }';
  await assert.rejects(
    ingest(incoming, call(json, { "x-twilio-signature": sign(URL_, "") })),
    /does not match/,
  );
});

test("errors never contain the token, the signature or the URL", async () => {
  const bad = "AAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  const msg = await ingest(incoming, call(BODY, { "x-twilio-signature": bad })).then(
    () => "",
    (e: Error) => e.message,
  );
  assert.ok(msg.length > 0);
  for (const leak of [TOKEN, bad, URL_]) assert.equal(msg.includes(leak), false);
});

test("message-status: a status callback fires it and incoming-message ignores it", async () => {
  const body = "MessageSid=SM9&MessageStatus=delivered&To=%2B1555&From=%2B1666&AccountSid=AC1";
  const [e] = evs(await ingest(status, signed(body))) as Array<Record<string, unknown>>;
  assert.deepEqual([e.messageSid, e.messageStatus], ["SM9", "delivered"]);
  assert.deepEqual(evs(await ingest(incoming, signed(body))), []);
  assert.deepEqual(evs(await ingest(status, signed())), []);
});

test("a truncated or extended signature -> refused", async () => {
  const good = sign(URL_, BODY);
  for (const sig of [good.slice(0, -1), good + "0"]) {
    await assert.rejects(
      ingest(incoming, call(BODY, { "x-twilio-signature": sig })),
      /signature does not match/,
    );
  }
});
