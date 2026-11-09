import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import newMessage from "../../triggers/new-message.ts";
import event from "../../triggers/event.ts";

const SECRET = "8f742231b10e8888abcd99yyyzzz85a5";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "token":"x",  "team_id":"T1DC2JH3J", "api_app_id":"A0PNCHHK2",
  "event": { "type":"message", "channel":"C2147483705", "user":"U2147483697",
  "text":"Hello world", "ts":"1355517523.000005" },
  "type":"event_callback", "event_id":"Ev0PV52K21", "event_time":1531420618 }`;

function sign(body: string, ts: string, secret = SECRET): string {
  return "v0=" + createHmac("sha256", secret).update(`v0:${ts}:${body}`).digest("hex");
}

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

function signed(body: string, ts = String(Math.floor(Date.now() / 1000))) {
  return call(body, { "x-slack-request-timestamp": ts, "x-slack-signature": sign(body, ts) });
}

function ingest(
  t: typeof newMessage,
  raw: TriggerCall,
  params: Record<string, unknown> = { signingSecret: SECRET },
) {
  return t.handleIngest!(
    { raw, params, state: { callbackUrl: "x" }, subscriptionId: "sub_1" },
    mockCtx().ctx,
  );
}

test("fixture: the body is not canonical JSON", () => {
  assert.notEqual(JSON.stringify(JSON.parse(BODY)), BODY);
});

test("app: declares both triggers with output and sample, no unsigned path", () => {
  assert.deepEqual(app.triggers.map((t) => t.key), ["new-message", "event"]);
  for (const t of app.triggers) {
    assert.ok(t.output.length > 0);
    assert.notEqual(t.sample, undefined);
    assert.equal(t.params!.find((p) => p.key === "signingSecret")!.type, "secret");
  }
});

test("onSubscribe makes no Slack call and returns the callback URL", async () => {
  const m = mockCtx();
  const state = await newMessage.onSubscribe!(
    {
      params: {},
      subscriptionId: "s",
      callbackUrl: "https://h/triggers/webhooks/s",
      hostUrl: "https://h",
    },
    m.ctx,
  );
  assert.deepEqual(state, { callbackUrl: "https://h/triggers/webhooks/s" });
  assert.equal(m.calls.length, 0);
  await newMessage.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, m.ctx);
});

test("valid signature over the raw body -> one event", async () => {
  const out = evs(await ingest(newMessage, signed(BODY)));
  assert.equal(out.length, 1);
  assert.deepEqual(
    { id: (out[0] as any).eventId, ch: (out[0] as any).channel, text: (out[0] as any).text },
    { id: "Ev0PV52K21", ch: "C2147483705", text: "Hello world" },
  );
});

test("header names match case-insensitively", async () => {
  const ts = String(Math.floor(Date.now() / 1000));
  const raw = call(BODY, { "X-Slack-Request-Timestamp": ts, "X-Slack-Signature": sign(BODY, ts) });
  assert.equal(evs(await ingest(newMessage, raw)).length, 1);
});

test("one flipped byte -> refused", async () => {
  const ts = String(Math.floor(Date.now() / 1000));
  const raw = call(BODY.replace("Hello", "Hallo"), {
    "x-slack-request-timestamp": ts,
    "x-slack-signature": sign(BODY, ts),
  });
  await assert.rejects(ingest(newMessage, raw), /signature does not match/);
});

test("signature computed over re-serialised JSON -> refused", async () => {
  const ts = String(Math.floor(Date.now() / 1000));
  const raw = call(BODY, {
    "x-slack-request-timestamp": ts,
    "x-slack-signature": sign(JSON.stringify(JSON.parse(BODY)), ts),
  });
  await assert.rejects(ingest(newMessage, raw), /signature does not match/);
});

test("wrong signing secret -> refused", async () => {
  await assert.rejects(
    ingest(newMessage, signed(BODY), { signingSecret: "other-secret" }),
    /refused/,
  );
});

test("missing signature or timestamp header -> refused", async () => {
  const ts = String(Math.floor(Date.now() / 1000));
  await assert.rejects(
    ingest(newMessage, call(BODY, { "x-slack-request-timestamp": ts })),
    /headers are missing/,
  );
  await assert.rejects(
    ingest(newMessage, call(BODY, { "x-slack-signature": sign(BODY, ts) })),
    /headers are missing/,
  );
  await assert.rejects(ingest(newMessage, call(BODY, {})), /headers are missing/);
});

test("rawBody absent -> refused", async () => {
  const ts = String(Math.floor(Date.now() / 1000));
  const raw = call(undefined, {
    "x-slack-request-timestamp": ts,
    "x-slack-signature": sign(BODY, ts),
  });
  await assert.rejects(ingest(newMessage, raw), /raw body/);
});

test("stale and future timestamps -> refused; the edge of the window passes", async () => {
  const now = Math.floor(Date.now() / 1000);
  await assert.rejects(
    ingest(newMessage, signed(BODY, String(now - 600))),
    /outside the allowed window/,
  );
  await assert.rejects(
    ingest(newMessage, signed(BODY, String(now + 600))),
    /outside the allowed window/,
  );
  await assert.rejects(
    ingest(newMessage, signed(BODY, "not-a-number")),
    /outside the allowed window/,
  );
  assert.equal(evs(await ingest(newMessage, signed(BODY, String(now - 240)))).length, 1);
});

test("unset or empty signing secret refuses, even with a header-less delivery", async () => {
  for (const params of [{}, { signingSecret: "" }, { signingSecret: undefined }]) {
    await assert.rejects(ingest(newMessage, call(BODY, {}), params), /not configured/);
    await assert.rejects(ingest(newMessage, signed(BODY), params), /not configured/);
  }
  // A signature made with the empty key must not verify either.
  const ts = String(Math.floor(Date.now() / 1000));
  const empty = call(BODY, {
    "x-slack-request-timestamp": ts,
    "x-slack-signature": sign(BODY, ts, ""),
  });
  await assert.rejects(ingest(newMessage, empty, { signingSecret: "" }), /not configured/);
});

test("errors never contain the secret, the signature or a header value", async () => {
  const ts = String(Math.floor(Date.now() / 1000));
  const badSig = "v0=" + "ab".repeat(32);
  const raw = call(BODY, { "x-slack-request-timestamp": ts, "x-slack-signature": badSig });
  const err = await ingest(newMessage, raw).then(() => "", (e: Error) => e.message);
  assert.ok(err.length > 0);
  for (const leak of [SECRET, badSig, ts]) assert.equal(err.includes(leak), false);
});

const CHALLENGE =
  `{ "token": "Jhj5dZrVaK7ZwHHjRyZWjbDl",   "challenge": "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P", "type": "url_verification" }`;

test("url_verification (signed) -> { events: [], response } echoing the challenge", async () => {
  const result = await ingest(newMessage, signed(CHALLENGE));
  assert.deepEqual(evs(result), []);
  assert.deepEqual((result as { response?: unknown }).response, {
    status: 200,
    headers: { "content-type": "text/plain" },
    body: "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P",
  });
});

test("url_verification is never answered without a valid signature", async () => {
  const ts = String(Math.floor(Date.now() / 1000));
  await assert.rejects(ingest(event, call(CHALLENGE, {})), /headers are missing/);
  await assert.rejects(
    ingest(
      event,
      call(CHALLENGE, {
        "x-slack-request-timestamp": ts,
        "x-slack-signature": sign(CHALLENGE, ts, "nope"),
      }),
    ),
    /does not match/,
  );
  await assert.rejects(ingest(event, call(CHALLENGE, {}), {}), /not configured/);
});

test("new-message filters: bots, subtypes, channel", async () => {
  const mk = (ev: Record<string, unknown>) =>
    JSON.stringify({
      type: "event_callback",
      event_id: "E1",
      event_time: 1,
      event: { type: "message", ts: "1.1", channel: "C1", ...ev },
    });
  assert.equal(
    evs(await ingest(newMessage, signed(mk({ bot_id: "B1", subtype: "bot_message" })))).length,
    0,
  );
  assert.equal(
    evs(
      await ingest(newMessage, signed(mk({ bot_id: "B1", subtype: "bot_message" })), {
        signingSecret: SECRET,
        ignoreBotMessages: false,
      }),
    ).length,
    1,
  );
  assert.equal(evs(await ingest(newMessage, signed(mk({ subtype: "message_changed" })))).length, 0);
  assert.equal(evs(await ingest(newMessage, signed(mk({ subtype: "file_share" })))).length, 1);
  assert.equal(
    evs(await ingest(newMessage, signed(mk({})), { signingSecret: SECRET, channelId: "C2" }))
      .length,
    0,
  );
  assert.equal(
    evs(await ingest(newMessage, signed(mk({})), { signingSecret: SECRET, channelId: "C1" }))
      .length,
    1,
  );
});

test("event trigger: every type by default, narrowed by eventTypes", async () => {
  const reaction = JSON.stringify({
    type: "event_callback",
    event_id: "E2",
    event: { type: "reaction_added", user: "U1" },
  });
  assert.equal(evs(await ingest(event, signed(reaction))).length, 1);
  assert.equal(
    evs(
      await ingest(event, signed(reaction), {
        signingSecret: SECRET,
        eventTypes: "message, reaction_added",
      }),
    ).length,
    1,
  );
  assert.equal(
    evs(await ingest(event, signed(reaction), { signingSecret: SECRET, eventTypes: "message" }))
      .length,
    0,
  );
});

test("non-event payloads (app_rate_limited) acknowledge with no event", async () => {
  const body = JSON.stringify({ type: "app_rate_limited", minute_rate_limited: 1 });
  assert.deepEqual(evs(await ingest(event, signed(body))), []);
});

test("a truncated or extended signature -> refused", async () => {
  const ts = String(Math.floor(Date.now() / 1000));
  const good = sign(BODY, ts);
  for (const sig of [good.slice(0, -1), good + "0"]) {
    const raw = call(BODY, { "x-slack-request-timestamp": ts, "x-slack-signature": sig });
    await assert.rejects(ingest(newMessage, raw), /signature does not match/);
  }
});
