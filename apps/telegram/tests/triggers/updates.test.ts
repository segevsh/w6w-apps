import { test } from "node:test";
import assert from "node:assert/strict";
import type { TriggerCall, TriggerDefinition } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";

/**
 * Round-3 update-type triggers (https://core.telegram.org/bots/api#update, setWebhook,
 * verified 2026-11-10). Telegram authenticates a delivery with the `secret_token` it echoes in
 * `X-Telegram-Bot-Api-Secret-Token` (there is no body signature), so the "signature" here is
 * that header value.
 */
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const SECRET = "test-secret-token";
const HEADER = "x-telegram-bot-api-secret-token";
const URL_BASE = "https://api.telegram.org/bot%7Btoken%7D";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

const NAMES = [
  ["edited-message", ["edited_message"]],
  ["channel-post", ["channel_post"]],
  ["edited-channel-post", ["edited_channel_post"]],
  ["callback-query", ["callback_query"]],
  ["inline-query", ["inline_query"]],
  ["shipping-query", ["shipping_query"]],
  ["pre-checkout-query", ["pre_checkout_query"]],
  ["poll", ["poll"]],
  ["chat-member-updated", ["chat_member", "my_chat_member"]],
] as const;

type Trig = TriggerDefinition<never, unknown, never>;
const byKey = (key: string) => (app.triggers ?? []).find((t) => t.key === key) as unknown as Trig;

function call(rawBody: string | undefined, headers: Record<string, string>): TriggerCall {
  return {
    method: "POST",
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers,
    body: rawBody === undefined ? null : JSON.parse(rawBody),
    ...(rawBody === undefined ? {} : { rawBody }),
  };
}

function ingest(t: Trig, raw: TriggerCall, state: unknown) {
  return Promise.resolve().then(() =>
    t.handleIngest!(
      { raw, params: {}, state: state as never, subscriptionId: "sub_1" },
      mockCtx().ctx,
    )
  );
}

/** The sample's own update, serialised with whitespace Telegram's compact JSON never has. */
function bodyOf(t: Trig): string {
  return JSON.stringify((t.sample as { update: unknown }).update, null, 2);
}

for (const [key, allowed] of NAMES) {
  const t = byKey(key);
  const state = { secretToken: SECRET, callbackUrl: CALLBACK, allowedUpdates: [...allowed] };

  test(`${key}: declared with output and a sample of the right update type`, () => {
    assert.ok(t, key);
    assert.ok((t.output?.length ?? 0) > 0);
    assert.ok(allowed.includes((t.sample as { updateType: string }).updateType as never));
    assert.equal(typeof t.poll, "undefined");
  });

  test(`${key}: fixture body is not canonical JSON`, () => {
    assert.notEqual(JSON.stringify(JSON.parse(bodyOf(t))), bodyOf(t));
  });

  test(`${key}: a delivery carrying the secret header yields exactly the sample event`, async () => {
    const out = evs(await ingest(t, call(bodyOf(t), { [HEADER]: SECRET }), state));
    assert.deepEqual(out, [t.sample]);
  });

  test(`${key}: onSubscribe sends setWebhook with this update type list and a random secret_token`, async () => {
    const m = mockCtx([
      { body: { ok: true, result: { url: "" } } },
      { body: { ok: true, result: true } },
    ]);
    const s = await t.onSubscribe!(
      { params: {} as never, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "h" },
      m.ctx,
    ) as { secretToken: string };
    assert.deepEqual([m.calls[0].method, m.calls[0].url], ["GET", `${URL_BASE}/getWebhookInfo`]);
    assert.deepEqual([m.calls[1].method, m.calls[1].url], ["POST", `${URL_BASE}/setWebhook`]);
    const sent = JSON.parse(m.calls[1].body!);
    assert.deepEqual(sent.allowed_updates, [...allowed]);
    assert.equal(sent.url, CALLBACK);
    assert.equal(sent.secret_token, s.secretToken);
    assert.match(sent.secret_token, /^[A-Za-z0-9_-]{32,256}$/);
  });

  test(`${key}: one flipped byte in the secret-token header, a missing or empty header -> refused`, async () => {
    for (
      const headers of [
        { [HEADER]: SECRET.slice(0, -1) + "X" },
        { [HEADER]: "X" + SECRET.slice(1) },
        { [HEADER]: SECRET + "x" },
        { [HEADER]: SECRET.slice(0, -1) },
        { [HEADER]: "" },
        {},
      ]
    ) {
      await assert.rejects(
        ingest(t, call(bodyOf(t), headers), state),
        /secret token header is missing or wrong/,
      );
    }
  });

  test(`${key}: rawBody absent -> refused`, async () => {
    await assert.rejects(ingest(t, call(undefined, { [HEADER]: SECRET }), state), /raw body/);
  });

  test(`${key}: unset or empty stored secret refuses, even with an absent or empty header`, async () => {
    for (const bad of [null, {}, { secretToken: "" }, { secretToken: undefined }]) {
      await assert.rejects(ingest(t, call(bodyOf(t), {}), bad), /not configured/);
      await assert.rejects(ingest(t, call(bodyOf(t), { [HEADER]: "" }), bad), /not configured/);
    }
  });

  test(`${key}: an update type outside the subscription is acknowledged with no event`, async () => {
    const other = JSON.stringify({ update_id: 1, message: { message_id: 1, chat: { id: 5 } } });
    assert.deepEqual(evs(await ingest(t, call(other, { [HEADER]: SECRET }), state)), []);
  });
}

test("the Bot Update trigger accepts the update types added to the Bot API since round 1", async () => {
  const t = byKey("update");
  for (const type of ["message_reaction", "business_message", "chat_boost", "managed_bot"]) {
    const m = mockCtx([
      { body: { ok: true, result: { url: "" } } },
      { body: { ok: true, result: true } },
    ]);
    await t.onSubscribe!(
      {
        params: { updateTypes: type } as never,
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "h",
      },
      m.ctx,
    );
    assert.deepEqual(JSON.parse(m.calls[1].body!).allowed_updates, [type]);
  }
  await assert.rejects(
    Promise.resolve().then(() =>
      t.onSubscribe!(
        {
          params: { updateTypes: "not_a_type" } as never,
          subscriptionId: "s",
          callbackUrl: CALLBACK,
          hostUrl: "h",
        },
        mockCtx([{ body: { ok: true, result: { url: "" } } }]).ctx,
      )
    ),
    /Unknown Telegram update type/,
  );
});
