import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { TriggerDefinition } from "@w6w/types";
import { envelope, errorBody, mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import anyEvent from "../../triggers/any-event.ts";
import videoTranslationCompleted from "../../triggers/video-translation-completed.ts";
import videoTranslationFailed from "../../triggers/video-translation-failed.ts";

const SECRET = "test-endpoint-secret-0123456789abcdef";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_3";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Independent of app code: node:crypto, hex HMAC-SHA256 of the exact body.
const sign = (b: string, secret = SECRET) => createHmac("sha256", secret).update(b).digest("hex");
/** The same signature with its last hex digit changed: ONE flipped byte of the signature itself. */
const flipLast = (sig: string) => sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const body = (type: string) =>
  `{ "event_id":"evt_7",  "event_type" : "${type}",
  "event_data": { "video_translation_id":"vt_1", "note" : "x" },
  "created_at":"2026-11-10T12:05:00Z" }`;

type Input = Parameters<NonNullable<TriggerDefinition["handleIngest"]>>[0];
function input(
  b: string | undefined,
  headers: Record<string, string>,
  over: { secret?: string | null; params?: Record<string, unknown> } = {},
): Input {
  const secret = over.secret === undefined ? SECRET : over.secret;
  return {
    raw: {
      method: "POST",
      path: "/",
      query: {},
      headers,
      body: b === undefined ? null : JSON.parse(b),
      ...(b === undefined ? {} : { rawBody: b }),
    },
    params: over.params ?? {},
    state: secret === null ? { endpointId: "ep_1" } : { endpointId: "ep_1", secret },
    subscriptionId: "sub_3",
  } as Input;
}
const run = (t: TriggerDefinition, i: Input) =>
  Promise.resolve().then(() => t.handleIngest!(i, mockCtx().ctx));

const NAMED: Array<[TriggerDefinition, string, string]> = [
  [videoTranslationCompleted, "video_translate.success", "video_translate.fail"],
  [videoTranslationFailed, "video_translate.fail", "video_translate.success"],
];

test("fixture body has non-canonical whitespace", () => {
  const b = body("video_translate.success");
  assert.notEqual(JSON.stringify(JSON.parse(b)), b);
});

test("app declares the original two triggers first, then the new ones, all with output and sample", () => {
  assert.deepEqual(app.triggers.slice(0, 2).map((t) => t.key), ["video-completed", "video-failed"]);
  const byKey = new Map(app.triggers.map((t) => [t.key, t]));
  for (const t of [videoTranslationCompleted, videoTranslationFailed, anyEvent]) {
    assert.equal(byKey.get(t.key), t);
    assert.ok(t.output!.length > 0);
    assert.notEqual(t.sample, undefined);
    assert.equal(t.poll, undefined);
    assert.equal(typeof t.onSubscribe, "function");
  }
  for (const k of ["new-template", "new-avatar-group", "new-avatar-look"]) {
    assert.equal(typeof byKey.get(k)!.poll, "function", k);
    assert.equal(byKey.get(k)!.onSubscribe, undefined, k);
  }
});

for (const [t, type, other] of NAMED) {
  const b = body(type);
  const HDR = "signature";

  test(`${type}: valid signature over a non-canonical body -> one normalised event`, async () => {
    const [e] = evs(await run(t, input(b, { [HDR]: sign(b) }))) as Array<Record<string, unknown>>;
    assert.deepEqual(
      [
        e.eventType,
        e.eventId,
        e.createdAt,
        (e.data as Record<string, unknown>).video_translation_id,
      ],
      [type, "evt_7", "2026-11-10T12:05:00Z", "vt_1"],
    );
  });

  test(`${type}: ONE flipped byte of the signature -> refused`, async () => {
    await assert.rejects(run(t, input(b, { [HDR]: flipLast(sign(b)) })), /does not match/);
  });

  test(`${type}: a flipped body byte, a re-serialised body, another secret -> refused`, async () => {
    await assert.rejects(
      run(t, input(b.replace("vt_1", "vt_2"), { [HDR]: sign(b) })),
      /does not match/,
    );
    await assert.rejects(
      run(t, input(b, { [HDR]: sign(JSON.stringify(JSON.parse(b))) })),
      /does not match/,
    );
    await assert.rejects(run(t, input(b, { [HDR]: sign(b, "other-secret") })), /does not match/);
  });

  test(`${type}: header missing or empty, rawBody absent -> refused`, async () => {
    await assert.rejects(run(t, input(b, {})), /signature header is missing/);
    await assert.rejects(run(t, input(b, { [HDR]: "" })), /signature header is missing/);
    await assert.rejects(run(t, input(undefined, { [HDR]: sign(b) })), /raw body/);
  });

  test(`${type}: an unset or empty stored secret is refused before any compare`, async () => {
    for (const secret of [null, ""]) {
      await assert.rejects(run(t, input(b, { [HDR]: sign(b) }, { secret })), /secret/);
      await assert.rejects(run(t, input(b, {}, { secret })), /secret/);
    }
  });

  test(`${type}: errors never echo the secret or the signature`, async () => {
    const bad = "ab".repeat(32);
    const msg = await run(t, input(b, { [HDR]: bad })).then(() => "", (e: Error) => e.message);
    assert.ok(msg.length > 0);
    for (const leak of [SECRET, bad]) assert.equal(msg.includes(leak), false);
  });

  test(`${type}: the other event type is acknowledged without an event`, async () => {
    const o = body(other);
    assert.deepEqual(evs(await run(t, input(o, { [HDR]: sign(o) }))), []);
  });

  test(`${type}: onSubscribe registers exactly this event type and keeps endpoint id + secret`, async () => {
    const m = mockCtx([{ body: envelope({ endpoint_id: "ep_9", secret: SECRET }) }]);
    const state = await t.onSubscribe!(
      { params: {}, subscriptionId: "sub_3", callbackUrl: CALLBACK, hostUrl: "" },
      m.ctx,
    );
    assert.deepEqual(state, { endpointId: "ep_9", secret: SECRET });
    assert.deepEqual([m.calls[0].method, m.calls[0].url], [
      "POST",
      "https://api.heygen.com/v3/webhooks/endpoints",
    ]);
    assert.deepEqual(JSON.parse(m.calls[0].body!), { url: CALLBACK, events: [type] });
  });
}

// ---- Any Event ----------------------------------------------------------------------------

const HDR = "signature";
const sub = (
  params: Record<string, unknown>,
  ctx: Parameters<NonNullable<typeof anyEvent.onSubscribe>>[1],
) =>
  anyEvent.onSubscribe!(
    { params, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );

test("any-event: with no filter the endpoint is registered WITHOUT an events list (HeyGen: all events)", async () => {
  const m = mockCtx([{ body: envelope({ endpoint_id: "ep_9", secret: SECRET }) }]);
  const state = await sub({}, m.ctx);
  assert.deepEqual(state, { endpointId: "ep_9", secret: SECRET });
  assert.deepEqual([m.calls[0].method, m.calls[0].url], [
    "POST",
    "https://api.heygen.com/v3/webhooks/endpoints",
  ]);
  assert.deepEqual(JSON.parse(m.calls[0].body!), { url: CALLBACK });
});

test("any-event: a filter registers exactly the listed event types, de-duplicated", async () => {
  const m = mockCtx([{ body: envelope({ endpoint_id: "ep_9", secret: SECRET }) }]);
  await sub({ events: "avatar_video.success, video_translate.fail,avatar_video.success" }, m.ctx);
  assert.deepEqual(JSON.parse(m.calls[0].body!), {
    url: CALLBACK,
    events: ["avatar_video.success", "video_translate.fail"],
  });
});

test("any-event: a malformed event name is refused before any request; no secret returned -> endpoint removed and fails", async () => {
  const none = mockCtx();
  await assert.rejects(sub({ events: "avatar video" }, none.ctx), /Not a HeyGen event type/);
  assert.equal(none.calls.length, 0);
  const m = mockCtx([
    { body: envelope({ endpoint_id: "ep_9", secret: null }) },
    { status: 200, body: envelope({}) },
  ]);
  await assert.rejects(sub({}, m.ctx), /signing secret/);
  assert.deepEqual(m.calls.map((c) => c.method), ["POST", "DELETE"]);
  assert.equal(m.calls[1].url, "https://api.heygen.com/v3/webhooks/endpoints/ep_9");
});

test("any-event: onUnsubscribe DELETEs the endpoint; 404 is gone; 500 propagates; none stored -> no call", async () => {
  const state = { endpointId: "ep_9", secret: SECRET };
  const ok = mockCtx([{ status: 200, body: envelope({}) }]);
  await anyEvent.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, ok.ctx);
  assert.deepEqual([ok.calls[0].method, ok.calls[0].url], [
    "DELETE",
    "https://api.heygen.com/v3/webhooks/endpoints/ep_9",
  ]);
  await anyEvent.onUnsubscribe!(
    { params: {}, state, subscriptionId: "s" },
    mockCtx([{ status: 404, body: errorBody("not_found", "no such endpoint") }]).ctx,
  );
  await assert.rejects(
    anyEvent.onUnsubscribe!(
      { params: {}, state, subscriptionId: "s" },
      mockCtx([{ status: 500, body: errorBody("internal", "boom") }]).ctx,
    ),
    /HeyGen 500/,
  );
  const none = mockCtx();
  await anyEvent.onUnsubscribe!({ params: {}, state: undefined, subscriptionId: "s" }, none.ctx);
  assert.equal(none.calls.length, 0);
});

test("any-event: every event type reaches the run when no filter is set", async () => {
  const types = [
    "avatar_video.success",
    "avatar_video.fail",
    "video_translate.success",
    "instant_avatar.success",
    "photo_avatar_train.fail",
    "batch.finished",
  ];
  const seen: string[] = [];
  for (const type of types) {
    const b = body(type);
    const [e] = evs(await run(anyEvent, input(b, { [HDR]: sign(b) }))) as Array<
      Record<string, unknown>
    >;
    seen.push(String(e.eventType));
  }
  assert.deepEqual(seen, types);
});

test("any-event: the events filter keeps only the listed event types", async () => {
  const params = { events: "video_translate.success, batch.finished" };
  const go = (type: string) => {
    const b = body(type);
    return run(anyEvent, input(b, { [HDR]: sign(b) }, { params }));
  };
  assert.deepEqual(evs(await go("avatar_video.success")), []);
  assert.deepEqual(evs(await go("video_translate.fail")), []);
  assert.equal(evs(await go("video_translate.success")).length, 1);
  assert.equal(evs(await go("batch.finished")).length, 1);
});

test("any-event: ONE flipped byte of the signature, a flipped body byte, header missing, rawBody absent, empty secret -> refused", async () => {
  const b = body("avatar_video.success");
  await assert.rejects(run(anyEvent, input(b, { [HDR]: flipLast(sign(b)) })), /does not match/);
  await assert.rejects(
    run(anyEvent, input(b.replace("vt_1", "vt_2"), { [HDR]: sign(b) })),
    /does not match/,
  );
  await assert.rejects(
    run(anyEvent, input(b, { [HDR]: sign(JSON.stringify(JSON.parse(b))) })),
    /does not match/,
  );
  await assert.rejects(run(anyEvent, input(b, {})), /signature header is missing/);
  await assert.rejects(run(anyEvent, input(undefined, { [HDR]: sign(b) })), /raw body/);
  for (const secret of [null, ""]) {
    await assert.rejects(run(anyEvent, input(b, {}, { secret })), /secret/);
    await assert.rejects(run(anyEvent, input(b, { [HDR]: sign(b) }, { secret })), /secret/);
  }
});
