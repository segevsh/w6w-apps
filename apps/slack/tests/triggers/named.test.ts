import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";

const SECRET = "test-secret";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// [trigger key, raw Events API event, expected type, expected channel, expected user]
const CASES: Array<[string, Record<string, unknown>, string, string | null, string | null]> = [
  [
    "app-mention",
    { type: "app_mention", user: "U1", text: "hi", ts: "1.1", channel: "C1" },
    "app_mention",
    "C1",
    "U1",
  ],
  [
    "reaction-added",
    {
      type: "reaction_added",
      user: "U1",
      reaction: "tada",
      item: { type: "message", channel: "C1", ts: "1.1" },
    },
    "reaction_added",
    "C1",
    "U1",
  ],
  [
    "reaction-removed",
    {
      type: "reaction_removed",
      user: "U1",
      reaction: "tada",
      item: { type: "message", channel: "C1", ts: "1.1" },
    },
    "reaction_removed",
    "C1",
    "U1",
  ],
  [
    "message-edited",
    {
      type: "message",
      subtype: "message_changed",
      channel: "C1",
      ts: "2.2",
      message: { text: "b" },
    },
    "message",
    "C1",
    null,
  ],
  [
    "message-deleted",
    { type: "message", subtype: "message_deleted", channel: "C1", ts: "2.2", deleted_ts: "1.1" },
    "message",
    "C1",
    null,
  ],
  [
    "channel-created",
    { type: "channel_created", channel: { id: "C1", name: "fun" } },
    "channel_created",
    "C1",
    null,
  ],
  [
    "channel-renamed",
    { type: "channel_rename", channel: { id: "C1", name: "new" } },
    "channel_rename",
    "C1",
    null,
  ],
  [
    "channel-archived",
    { type: "channel_archive", channel: "C1", user: "U1" },
    "channel_archive",
    "C1",
    "U1",
  ],
  [
    "channel-unarchived",
    { type: "channel_unarchive", channel: "C1", user: "U1" },
    "channel_unarchive",
    "C1",
    "U1",
  ],
  ["channel-deleted", { type: "channel_deleted", channel: "C1" }, "channel_deleted", "C1", null],
  [
    "member-joined-channel",
    { type: "member_joined_channel", user: "U1", channel: "C1" },
    "member_joined_channel",
    "C1",
    "U1",
  ],
  [
    "member-left-channel",
    { type: "member_left_channel", user: "U1", channel: "C1" },
    "member_left_channel",
    "C1",
    "U1",
  ],
  [
    "file-created",
    { type: "file_created", file_id: "F1", file: { id: "F1" } },
    "file_created",
    null,
    null,
  ],
  [
    "file-shared",
    { type: "file_shared", channel_id: "C1", file_id: "F1", user_id: "U1", file: { id: "F1" } },
    "file_shared",
    "C1",
    "U1",
  ],
  ["file-deleted", { type: "file_deleted", file_id: "F1" }, "file_deleted", null, null],
  ["team-join", { type: "team_join", user: { id: "U1", name: "ada" } }, "team_join", null, "U1"],
  [
    "user-updated",
    { type: "user_change", user: { id: "U1", name: "ada" } },
    "user_change",
    null,
    "U1",
  ],
  [
    "usergroup-created",
    { type: "subteam_created", subteam: { id: "S1" } },
    "subteam_created",
    null,
    null,
  ],
  [
    "usergroup-updated",
    { type: "subteam_updated", subteam: { id: "S1" } },
    "subteam_updated",
    null,
    null,
  ],
  [
    "usergroup-members-changed",
    { type: "subteam_members_changed", subteam_id: "S1" },
    "subteam_members_changed",
    null,
    null,
  ],
  [
    "star-added",
    { type: "star_added", user: "U1", item: { type: "message", channel: "C1" } },
    "star_added",
    "C1",
    "U1",
  ],
  [
    "star-removed",
    { type: "star_removed", user: "U1", item: { type: "message", channel: "C1" } },
    "star_removed",
    "C1",
    "U1",
  ],
];

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
function bodyFor(ev: Record<string, unknown>): string {
  return `{ "token":"x",  "team_id":"T1", "api_app_id":"A1",\n  "event": ${
    JSON.stringify(ev)
  },\n  "type":"event_callback", "event_id":"Ev1", "event_time":1531420618 }`;
}

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

const trigger = (key: string) => app.triggers.find((t) => t.key === key)!;

function ingest(
  key: string,
  raw: TriggerCall,
  params: Record<string, unknown> = { signingSecret: SECRET },
) {
  return trigger(key).handleIngest!(
    { raw, params, state: { callbackUrl: "x" }, subscriptionId: "sub_1" },
    mockCtx().ctx,
  );
}

test("every named trigger is wired in index.ts with output, sample and a secret param", () => {
  const keys = app.triggers.map((t) => t.key);
  for (const [key] of CASES) {
    assert.ok(keys.includes(key), key);
    const t = trigger(key);
    assert.ok(t.output.length > 0, key);
    assert.notEqual(t.sample, undefined, key);
    assert.equal(t.params!.find((p) => p.key === "signingSecret")!.type, "secret", key);
  }
  assert.equal(new Set(keys).size, keys.length, "trigger keys are unique");
});

for (const [key, ev, type, channel, user] of CASES) {
  test(`${key}: a valid signed delivery -> one event with the right type, channel and user`, async () => {
    const result = evs(await ingest(key, signed(bodyFor(ev)))) as Array<Record<string, unknown>>;
    assert.equal(result.length, 1);
    assert.equal(result[0].type, type);
    assert.equal(result[0].channel, channel);
    assert.equal(result[0].user, user);
    assert.equal(result[0].eventId, "Ev1");
    assert.deepEqual(result[0].event, ev);
  });

  test(`${key}: an unrelated event type is acknowledged with no event`, async () => {
    const other = { type: "pin_added", user: "U9", channel_id: "C9" };
    assert.deepEqual(evs(await ingest(key, signed(bodyFor(other)))), []);
  });

  test(`${key}: one flipped byte, missing header, absent rawBody, stale timestamp, unset secret -> refused`, async () => {
    const body = bodyFor(ev);
    const ts = String(Math.floor(Date.now() / 1000));
    const good = signed(body, ts);
    const sig = good.headers["x-slack-signature"];
    const flipped = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    await assert.rejects(
      ingest(key, call(body, { ...good.headers, "x-slack-signature": flipped })),
      /signature does not match/,
    );
    await assert.rejects(
      ingest(key, call(body, { "x-slack-request-timestamp": ts })),
      /signature headers are missing/,
    );
    const noRaw = call(undefined, good.headers);
    await assert.rejects(ingest(key, noRaw), /raw body/);
    const old = String(Math.floor(Date.now() / 1000) - 400);
    await assert.rejects(ingest(key, signed(body, old)), /outside the allowed window/);
    for (const secret of [undefined, ""]) {
      await assert.rejects(ingest(key, signed(body, ts), { signingSecret: secret }), /secret/);
      // an unset secret must not verify a delivery that carries no signature either
      await assert.rejects(
        ingest(key, call(body, {}), { signingSecret: secret }),
        /secret/,
      );
    }
  });
}

test("channel-scoped triggers deliver only the configured channel; others take no channel filter", async () => {
  const react = {
    type: "reaction_added",
    user: "U1",
    reaction: "tada",
    item: { type: "message", channel: "C1", ts: "1.1" },
  };
  const p = (channelId: string) => ({ signingSecret: SECRET, channelId });
  assert.equal(evs(await ingest("reaction-added", signed(bodyFor(react)), p("C1"))).length, 1);
  assert.deepEqual(evs(await ingest("reaction-added", signed(bodyFor(react)), p("C2"))), []);
  for (const key of ["channel-created", "team-join", "user-updated", "usergroup-created"]) {
    assert.equal(trigger(key).params!.some((x) => x.key === "channelId"), false, key);
  }
  assert.equal(trigger("reaction-added").params!.some((x) => x.key === "channelId"), true);
});

test("message-edited and message-deleted split on the message subtype, not on the type alone", async () => {
  const edited = { type: "message", subtype: "message_changed", channel: "C1", ts: "2.2" };
  const plain = { type: "message", channel: "C1", user: "U1", text: "hi", ts: "3.3" };
  assert.equal(evs(await ingest("message-edited", signed(bodyFor(edited)))).length, 1);
  assert.deepEqual(evs(await ingest("message-deleted", signed(bodyFor(edited)))), []);
  assert.deepEqual(evs(await ingest("message-edited", signed(bodyFor(plain)))), []);
});

test("the existing event trigger now fills channel and user for object-valued fields", async () => {
  const created = { type: "channel_created", channel: { id: "C1", name: "fun" } };
  const out = evs(await ingest("event", signed(bodyFor(created)))) as Array<
    Record<string, unknown>
  >;
  assert.equal(out[0].channel, "C1");
});

test("url_verification is answered only with a valid signature on a named trigger too", async () => {
  const body =
    `{ "token":"x", "challenge":"3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P", "type":"url_verification" }`;
  const res = await ingest("reaction-added", signed(body)) as { response?: { body?: string } };
  assert.equal(res.response?.body, "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P");
  await assert.rejects(ingest("reaction-added", call(body, {})), /signature headers are missing/);
});

test("onSubscribe makes no Slack call and returns the callback URL for every named trigger", async () => {
  for (const [key] of CASES) {
    const m = mockCtx();
    const state = await trigger(key).onSubscribe!(
      { params: {}, subscriptionId: "s", callbackUrl: "https://h/t/s", hostUrl: "https://h" },
      m.ctx,
    );
    assert.deepEqual(state, { callbackUrl: "https://h/t/s" });
    assert.equal(m.calls.length, 0);
  }
});
