import { test } from "node:test";
import assert from "node:assert/strict";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import newMessage from "../../triggers/new-message.ts";
import update from "../../triggers/update.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const SECRET = "s3cr3t_token-AbC123";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const STATE = { secretToken: SECRET, callbackUrl: CALLBACK, allowedUpdates: ["message"] };

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "update_id": 10000,
  "message": { "message_id": 1365, "from": { "id": 1111111 },  "chat": { "id": 1111111, "type": "private" },
  "date": 1441645532, "text": "Hello" } }`;

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

function ingest(t: typeof newMessage, raw: TriggerCall, state: unknown = STATE) {
  return Promise.resolve().then(() =>
    t.handleIngest!(
      { raw, params: {}, state: state as never, subscriptionId: "sub_1" },
      mockCtx().ctx,
    )
  );
}

const OK = { "x-telegram-bot-api-secret-token": SECRET };
const URL_BASE = "https://api.telegram.org/bot%7Btoken%7D";

test("fixture: the body is not canonical JSON", () => {
  assert.notEqual(JSON.stringify(JSON.parse(BODY)), BODY);
});

test("app: declares both triggers with output and sample", () => {
  assert.deepEqual(app.triggers.map((t) => t.key), ["new-message", "update"]);
  for (const t of app.triggers) {
    assert.ok(t.output.length > 0);
    assert.notEqual(t.sample, undefined);
  }
});

test("onSubscribe: getWebhookInfo, then setWebhook with url + random secret_token", async () => {
  const m = mockCtx([
    { body: { ok: true, result: { url: "" } } },
    { body: { ok: true, result: true } },
  ]);
  const state = await newMessage.onSubscribe!(
    {
      params: {},
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "https://api.example.test",
    },
    m.ctx,
  ) as { secretToken: string };
  assert.equal(m.calls.length, 2);
  assert.deepEqual([m.calls[0].method, m.calls[0].url], ["GET", `${URL_BASE}/getWebhookInfo`]);
  assert.deepEqual([m.calls[1].method, m.calls[1].url], ["POST", `${URL_BASE}/setWebhook`]);
  const sent = JSON.parse(m.calls[1].body!);
  assert.deepEqual(Object.keys(sent).sort(), ["allowed_updates", "secret_token", "url"]);
  assert.equal(sent.url, CALLBACK);
  assert.deepEqual(sent.allowed_updates, ["message"]);
  assert.match(sent.secret_token, /^[A-Za-z0-9_-]{32,256}$/);
  assert.equal(state.secretToken, sent.secret_token);
});

test("onSubscribe: refuses when the bot already has another webhook, without setting anything", async () => {
  const m = mockCtx([{ body: { ok: true, result: { url: "https://elsewhere.example/hook" } } }]);
  await assert.rejects(
    newMessage.onSubscribe!(
      { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "h" },
      m.ctx,
    ),
    /already has a webhook/,
  );
  assert.equal(m.calls.length, 1);
});

test("onSubscribe: a leftover webhook on our own URL is replaced; update trigger validates types", async () => {
  const m = mockCtx([
    { body: { ok: true, result: { url: CALLBACK } } },
    { body: { ok: true, result: true } },
  ]);
  await update.onSubscribe!(
    {
      params: { updateTypes: "message, callback_query" },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "h",
    },
    m.ctx,
  );
  assert.deepEqual(JSON.parse(m.calls[1].body!).allowed_updates, ["message", "callback_query"]);
  await assert.rejects(
    update.onSubscribe!(
      {
        params: { updateTypes: "bogus" },
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "h",
      },
      mockCtx().ctx,
    ),
    /Unknown Telegram update type/,
  );
});

test("onUnsubscribe: deleteWebhook while the webhook is ours; nothing when it is gone or replaced", async () => {
  const ours = mockCtx([{ body: { ok: true, result: { url: CALLBACK } } }, {
    body: { ok: true, result: true },
  }]);
  await newMessage.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, ours.ctx);
  assert.deepEqual([ours.calls[1].method, ours.calls[1].url], [
    "POST",
    `${URL_BASE}/deleteWebhook`,
  ]);
  assert.deepEqual(JSON.parse(ours.calls[1].body!), { drop_pending_updates: false });

  for (const url of ["", "https://other.example/x"]) {
    const m = mockCtx([{ body: { ok: true, result: { url } } }]);
    await newMessage.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, m.ctx);
    assert.equal(m.calls.length, 1);
  }
  const none = mockCtx();
  await newMessage.onUnsubscribe!({ params: {}, state: {}, subscriptionId: "s" }, none.ctx);
  assert.equal(none.calls.length, 0);
});

test("valid secret header over a non-canonical body -> one event", async () => {
  const out = evs(await ingest(newMessage, call(BODY, OK)));
  assert.equal(out.length, 1);
  const e = out[0] as Record<string, unknown>;
  assert.deepEqual([e.updateId, e.updateType, e.chatId, e.fromId, e.text], [
    10000,
    "message",
    "1111111",
    "1111111",
    "Hello",
  ]);
});

test("header name matches case-insensitively", async () => {
  const out = evs(
    await ingest(newMessage, call(BODY, { "X-Telegram-Bot-Api-Secret-Token": SECRET })),
  );
  assert.equal(out.length, 1);
});

test("wrong secret, one flipped byte, missing header, empty header -> refused", async () => {
  for (
    const headers of [
      { "x-telegram-bot-api-secret-token": "wrong" },
      { "x-telegram-bot-api-secret-token": SECRET.slice(0, -1) + "X" },
      { "x-telegram-bot-api-secret-token": SECRET + "x" },
      { "x-telegram-bot-api-secret-token": "" },
      {},
    ]
  ) {
    await assert.rejects(
      ingest(newMessage, call(BODY, headers)),
      /secret token header is missing or wrong/,
    );
  }
});

test("rawBody absent -> refused", async () => {
  await assert.rejects(ingest(newMessage, call(undefined, OK)), /raw body/);
});

test("unset or empty stored secret refuses, even with an absent header", async () => {
  for (const state of [null, {}, { secretToken: "" }, { secretToken: undefined }]) {
    await assert.rejects(ingest(newMessage, call(BODY, {}), state), /not configured/);
    await assert.rejects(
      ingest(newMessage, call(BODY, { "x-telegram-bot-api-secret-token": "" }), state),
      /not configured/,
    );
  }
});

test("errors never contain the secret or a header value", async () => {
  const sent = "attacker-guess-value";
  const msg = await ingest(newMessage, call(BODY, { "x-telegram-bot-api-secret-token": sent }))
    .then(() => "", (e: Error) => e.message);
  assert.ok(msg.length > 0);
  assert.equal(msg.includes(SECRET) || msg.includes(sent), false);
});

test("update types outside the subscription are acknowledged without an event", async () => {
  const edited = JSON.stringify({
    update_id: 2,
    edited_message: { message_id: 1, chat: { id: 5 }, text: "x" },
  });
  assert.deepEqual(evs(await ingest(newMessage, call(edited, OK))), []);
  const all = evs(await ingest(update, call(edited, OK), { ...STATE, allowedUpdates: null }));
  assert.equal((all[0] as { updateType: string }).updateType, "edited_message");
});

test("callback_query: text is the button data, chat comes from its message", async () => {
  const cb = JSON.stringify({
    update_id: 3,
    callback_query: {
      id: "9",
      from: { id: 77 },
      data: "btn",
      message: { message_id: 4, chat: { id: -100 }, date: 5 },
    },
  });
  const [e] = evs(await ingest(update, call(cb, OK), { ...STATE, allowedUpdates: null })) as Array<
    Record<string, unknown>
  >;
  assert.deepEqual([e.updateType, e.text, e.chatId, e.fromId, e.messageId], [
    "callback_query",
    "btn",
    "-100",
    "77",
    4,
  ]);
});
