import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import messageDeleted from "../../triggers/message-deleted.ts";
import membershipUpdated from "../../triggers/membership-updated.ts";
import membershipDeleted from "../../triggers/membership-deleted.ts";
import roomCreated from "../../triggers/room-created.ts";
import roomUpdated from "../../triggers/room-updated.ts";
import anyEvent from "../../triggers/any-event.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_9";
const SECRET = "test-secret-0123456789abcdef0123";
const STATE = { webhookId: "WH9", secret: SECRET, resource: "x", event: "y", personId: "ME" };
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Independent of app code: node:crypto, hex HMAC-SHA1 of the exact body.
const sign = (body: string, secret = SECRET) =>
  createHmac("sha1", secret).update(body).digest("hex");
/** The same signature with its last hex digit changed: ONE flipped byte of the signature itself. */
const flipLast = (sig: string) => sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const bodyFor = (resource: string, event: string, data: string) =>
  `{ "id": "WH9",  "name": "w6w", "resource": "${resource}", "event": "${event}",
  "orgId": "ORG", "createdBy": "P1", "appId": "A1", "ownedBy": "creator", "status": "active",
  "created": "2026-01-01T12:00:00.000Z", "actorId": "ACTOR",
  "data": ${data} }`;

function call(body: string | undefined, headers: Record<string, string>): TriggerCall {
  return {
    method: "POST",
    path: "/triggers/webhooks/sub_9",
    query: {},
    headers,
    body: body === undefined ? null : JSON.parse(body),
    ...(body === undefined ? {} : { rawBody: body }),
  };
}

type Named = typeof roomCreated;
function ingest(t: Named, raw: TriggerCall, state: unknown = STATE, params = {}) {
  return Promise.resolve().then(() =>
    t.handleIngest!({ raw, params, state: state as never, subscriptionId: "sub_9" }, mockCtx().ctx)
  );
}

const ROOM_DATA = `{ "id": "ROOM9",  "title": "Unicorn", "type": "group", "isLocked": true }`;
const MEMBER_DATA =
  `{ "id": "MEM1",  "roomId": "ROOM1", "personId": "P2", "personEmail": "p@example.com" }`;
const MSG_DATA =
  `{ "id": "MSG1",  "roomId": "ROOM1", "personId": "P2", "personEmail": "p@example.com" }`;

const CASES: Array<
  { t: Named; resource: string; event: string; data: string; id: string; roomId: string }
> = [
  {
    t: roomCreated,
    resource: "rooms",
    event: "created",
    data: ROOM_DATA,
    id: "ROOM9",
    roomId: "ROOM9",
  },
  {
    t: roomUpdated,
    resource: "rooms",
    event: "updated",
    data: ROOM_DATA,
    id: "ROOM9",
    roomId: "ROOM9",
  },
  {
    t: membershipUpdated,
    resource: "memberships",
    event: "updated",
    data: MEMBER_DATA,
    id: "MEM1",
    roomId: "ROOM1",
  },
  {
    t: membershipDeleted,
    resource: "memberships",
    event: "deleted",
    data: MEMBER_DATA,
    id: "MEM1",
    roomId: "ROOM1",
  },
  {
    t: messageDeleted,
    resource: "messages",
    event: "deleted",
    data: MSG_DATA,
    id: "MSG1",
    roomId: "ROOM1",
  },
];

test("fixture: the body is not canonical JSON", () => {
  const b = bodyFor("rooms", "created", ROOM_DATA);
  assert.notEqual(JSON.stringify(JSON.parse(b)), b);
});

test("app: declares the webhook triggers with output and sample, no poll", () => {
  const keys = app.triggers.map((t) => t.key);
  for (
    const k of [
      "new-message",
      "new-membership",
      "message-deleted",
      "membership-updated",
      "membership-deleted",
      "room-created",
      "room-updated",
      "any-event",
    ]
  ) assert.ok(keys.includes(k), k);
  for (const t of [...CASES.map((c) => c.t), anyEvent]) {
    assert.ok(t.output.length > 0);
    assert.notEqual(t.sample, undefined);
    assert.equal(t.poll, undefined);
    assert.equal(typeof t.onSubscribe, "function");
    assert.equal(typeof t.onUnsubscribe, "function");
  }
});

for (const { t, resource, event, data, id, roomId } of CASES) {
  const name = `${t.key} (${resource}.${event})`;
  const body = bodyFor(resource, event, data);
  const signed = () => call(body, { "x-spark-signature": sign(body) });

  test(`${name}: valid hex HMAC-SHA1 over a non-canonical raw body -> one event`, async () => {
    const [e] = evs(await ingest(t, signed())) as Array<Record<string, unknown>>;
    assert.deepEqual(
      [e.webhookId, e.resource, e.event, e.id, e.roomId, e.actorId],
      ["WH9", resource, event, id, roomId, "ACTOR"],
    );
  });

  test(`${name}: ONE flipped byte of the signature -> refused`, async () => {
    await assert.rejects(
      ingest(t, call(body, { "x-spark-signature": flipLast(sign(body)) })),
      /does not match/,
    );
  });

  test(`${name}: one flipped byte of the body, a re-serialised body, a wrong secret -> refused`, async () => {
    await assert.rejects(
      ingest(t, call(body.replace("ORG", "ORH"), { "x-spark-signature": sign(body) })),
      /does not match/,
    );
    await assert.rejects(
      ingest(
        t,
        call(body, { "x-spark-signature": sign(JSON.stringify(JSON.parse(body))) }),
      ),
      /does not match/,
    );
    await assert.rejects(
      ingest(t, call(body, { "x-spark-signature": sign(body, "other-secret") })),
      /does not match/,
    );
  });

  test(`${name}: header missing or empty, rawBody absent -> refused`, async () => {
    await assert.rejects(ingest(t, call(body, {})), /signature header is missing/);
    await assert.rejects(
      ingest(t, call(body, { "x-spark-signature": "" })),
      /signature header is missing/,
    );
    await assert.rejects(
      ingest(t, call(undefined, { "x-spark-signature": sign(body) })),
      /raw body/,
    );
  });

  test(`${name}: an unset or empty stored secret is refused before any compare`, async () => {
    for (const state of [null, {}, { ...STATE, secret: "" }, { ...STATE, secret: undefined }]) {
      await assert.rejects(ingest(t, call(body, {}), state), /not configured/);
      await assert.rejects(ingest(t, signed(), state), /not configured/);
    }
  });

  test(`${name}: errors never echo the secret or the signature`, async () => {
    const bad = "ab".repeat(20);
    const msg = await ingest(t, call(body, { "x-spark-signature": bad })).then(
      () => "",
      (e: Error) => e.message,
    );
    assert.ok(msg.length > 0);
    for (const leak of [SECRET, bad]) assert.equal(msg.includes(leak), false);
  });

  test(`${name}: another resource or event is acknowledged without an event`, async () => {
    const other = bodyFor(resource, event === "created" ? "updated" : "created", data);
    assert.deepEqual(
      evs(await ingest(t, call(other, { "x-spark-signature": sign(other) }))),
      [],
    );
    const otherResource = bodyFor("messages" === resource ? "rooms" : "messages", event, data);
    assert.deepEqual(
      evs(await ingest(t, call(otherResource, { "x-spark-signature": sign(otherResource) }))),
      [],
    );
  });
}

test("room triggers: no params, no filter on registration; the subscription body is literal", async () => {
  assert.deepEqual(roomCreated.params, []);
  const m = mockCtx([{ body: { items: [] } }, { body: { id: "WH5" } }]);
  const state = await roomCreated.onSubscribe!(
    { params: {}, subscriptionId: "sub_9", callbackUrl: CALLBACK, hostUrl: "h" },
    m.ctx,
  ) as typeof STATE;
  assert.deepEqual(m.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://webexapis.com/v1/webhooks?max=100"],
    ["POST", "https://webexapis.com/v1/webhooks"],
  ]);
  const sent = JSON.parse(m.calls[1].body!);
  assert.deepEqual(Object.keys(sent).sort(), ["event", "name", "resource", "secret", "targetUrl"]);
  assert.deepEqual(
    [sent.resource, sent.event, sent.targetUrl, sent.name],
    ["rooms", "created", CALLBACK, "w6w sub_9"],
  );
  assert.match(sent.secret, /^[0-9a-f]{64}$/);
  assert.deepEqual([state.webhookId, state.secret, state.personId], ["WH5", sent.secret, null]);
});

test("message-deleted: own deletions skipped unless includeOwnMessages; room filter narrows; no message fetch", async () => {
  const body = bodyFor("messages", "deleted", MSG_DATA);
  const own = body.replace('"actorId": "ACTOR"', '"actorId": "ME"');
  const sig = (b: string) => call(b, { "x-spark-signature": sign(b) });
  assert.deepEqual(evs(await ingest(messageDeleted, sig(own))), []);
  assert.equal(
    evs(await ingest(messageDeleted, sig(own), STATE, { includeOwnMessages: true })).length,
    1,
  );
  assert.deepEqual(evs(await ingest(messageDeleted, sig(body), STATE, { roomId: "ROOM2" })), []);
  assert.equal(evs(await ingest(messageDeleted, sig(body), STATE, { roomId: "ROOM1" })).length, 1);
  const [e] = evs(await ingest(messageDeleted, sig(body))) as unknown[];
  const m = mockCtx();
  const out = await messageDeleted.parseOutput!(
    { call: {}, normalized: e as never, subscriptionId: "s" },
    m.ctx,
  ) as { text: unknown; message: unknown };
  assert.equal(m.calls.length, 0, "a deleted message is gone: no GET /messages/{id}");
  assert.deepEqual([out.text, out.message], [null, null]);
});

// ---- Any Event ----------------------------------------------------------------------------

const anyBody = (resource: string, event: string, data: string) => bodyFor(resource, event, data);
const anySigned = (b: string) => call(b, { "x-spark-signature": sign(b) });

test("any-event: onSubscribe registers resource=all event=all with a random secret, cleaning leftovers first", async () => {
  const m = mockCtx([
    { body: { items: [{ id: "OLD", targetUrl: CALLBACK }] } },
    { status: 204 },
    { body: { id: "WH7", secret: "echoed" } },
  ]);
  const state = await anyEvent.onSubscribe!(
    {
      params: { events: "messages.created, rooms.updated" },
      subscriptionId: "sub_9",
      callbackUrl: CALLBACK,
      hostUrl: "h",
    },
    m.ctx,
  ) as typeof STATE;
  assert.deepEqual(m.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://webexapis.com/v1/webhooks?max=100"],
    ["DELETE", "https://webexapis.com/v1/webhooks/OLD"],
    ["POST", "https://webexapis.com/v1/webhooks"],
  ]);
  const sent = JSON.parse(m.calls[2].body!);
  assert.deepEqual(Object.keys(sent).sort(), ["event", "name", "resource", "secret", "targetUrl"]);
  assert.deepEqual(
    [sent.resource, sent.event, sent.targetUrl, sent.name],
    ["all", "all", CALLBACK, "w6w sub_9"],
  );
  assert.match(sent.secret, /^[0-9a-f]{64}$/);
  assert.deepEqual([state.webhookId, state.secret], ["WH7", sent.secret]);
});

test("any-event: an unknown event name is refused at subscribe time, before any request", async () => {
  const m = mockCtx();
  await assert.rejects(
    anyEvent.onSubscribe!(
      {
        params: { events: "messages.created,messages.typo" },
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "h",
      },
      m.ctx,
    ),
    /messages\.typo/,
  );
  assert.equal(m.calls.length, 0);
});

test("any-event: onUnsubscribe DELETEs the webhook; 404/410 are already gone; 500 propagates", async () => {
  const ok = mockCtx([{ status: 204 }]);
  await anyEvent.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, ok.ctx);
  assert.deepEqual([ok.calls[0].method, ok.calls[0].url], [
    "DELETE",
    "https://webexapis.com/v1/webhooks/WH9",
  ]);
  for (const status of [404, 410]) {
    await anyEvent.onUnsubscribe!(
      { params: {}, state: STATE, subscriptionId: "s" },
      mockCtx([{ status, body: { message: "gone" } }]).ctx,
    );
  }
  await assert.rejects(
    anyEvent.onUnsubscribe!(
      { params: {}, state: STATE, subscriptionId: "s" },
      mockCtx([{ status: 500, body: { message: "boom" } }]).ctx,
    ),
    /Webex 500/,
  );
});

test("any-event: every catalog event reaches the run when no filter is set", async () => {
  const seen: string[] = [];
  for (
    const [resource, event, data] of [
      ["messages", "created", MSG_DATA],
      ["messages", "deleted", MSG_DATA],
      ["memberships", "created", MEMBER_DATA],
      ["memberships", "updated", MEMBER_DATA],
      ["memberships", "deleted", MEMBER_DATA],
      ["rooms", "created", ROOM_DATA],
      ["rooms", "updated", ROOM_DATA],
    ]
  ) {
    const [e] = evs(
      await ingest(anyEvent as never, anySigned(anyBody(resource, event, data))),
    ) as Array<Record<string, unknown>>;
    seen.push(`${e.resource}.${e.event}`);
  }
  assert.deepEqual(seen, [
    "messages.created",
    "messages.deleted",
    "memberships.created",
    "memberships.updated",
    "memberships.deleted",
    "rooms.created",
    "rooms.updated",
  ]);
});

test("any-event: the events filter keeps only the listed events (and a rooms event names the room by data.id)", async () => {
  const params = { events: "rooms.updated, memberships.deleted" };
  const run = (r: string, e: string, d: string) =>
    ingest(anyEvent as never, anySigned(anyBody(r, e, d)), STATE, params);
  assert.deepEqual(evs(await run("messages", "created", MSG_DATA)), []);
  assert.deepEqual(evs(await run("rooms", "created", ROOM_DATA)), []);
  const [room] = evs(await run("rooms", "updated", ROOM_DATA)) as Array<Record<string, unknown>>;
  assert.deepEqual([room.resource, room.event, room.roomId, room.id], [
    "rooms",
    "updated",
    "ROOM9",
    "ROOM9",
  ]);
  assert.equal(evs(await run("memberships", "deleted", MEMBER_DATA)).length, 1);
});

test("any-event: ONE flipped byte of the signature, a flipped body byte, header missing, rawBody absent -> refused", async () => {
  const b = anyBody("messages", "created", MSG_DATA);
  const run = (raw: TriggerCall, state: unknown = STATE) => ingest(anyEvent as never, raw, state);
  await assert.rejects(run(call(b, { "x-spark-signature": flipLast(sign(b)) })), /does not match/);
  await assert.rejects(
    run(call(b.replace("ORG", "ORH"), { "x-spark-signature": sign(b) })),
    /does not match/,
  );
  await assert.rejects(
    run(call(b, { "x-spark-signature": sign(JSON.stringify(JSON.parse(b))) })),
    /does not match/,
  );
  await assert.rejects(run(call(b, {})), /signature header is missing/);
  await assert.rejects(run(call(undefined, { "x-spark-signature": sign(b) })), /raw body/);
  for (const state of [null, {}, { ...STATE, secret: "" }]) {
    await assert.rejects(run(call(b, {}), state), /not configured/);
    await assert.rejects(run(anySigned(b), state), /not configured/);
  }
});

test("any-event: a body with no resource/event, or a JSON array, is refused after the signature passes", async () => {
  const nameless = `{ "id": "WH9",  "data": {} }`;
  await assert.rejects(ingest(anyEvent as never, anySigned(nameless)), /names no resource/);
  const notJson = "[1,  2]";
  await assert.rejects(ingest(anyEvent as never, anySigned(notJson)), /not a JSON object/);
});

test("any-event: parseOutput fetches a created message's text; other events are passed through", async () => {
  const [created] = evs(
    await ingest(anyEvent as never, anySigned(anyBody("messages", "created", MSG_DATA))),
  ) as unknown[];
  const m = mockCtx([{ body: { id: "MSG1", text: "hi there" } }]);
  const out = await anyEvent.parseOutput!(
    { call: {}, normalized: created as never, subscriptionId: "s" },
    m.ctx,
  ) as { text: string };
  assert.deepEqual([m.calls[0].method, m.calls[0].url], [
    "GET",
    "https://webexapis.com/v1/messages/MSG1",
  ]);
  assert.equal(out.text, "hi there");
  const [room] = evs(
    await ingest(anyEvent as never, anySigned(anyBody("rooms", "created", ROOM_DATA))),
  ) as unknown[];
  const none = mockCtx();
  await anyEvent.parseOutput!(
    { call: {}, normalized: room as never, subscriptionId: "s" },
    none.ctx,
  );
  assert.equal(none.calls.length, 0);
});
