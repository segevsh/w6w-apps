import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { envelope, errorBody, mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import videoCompleted from "../../triggers/video-completed.ts";
import videoFailed from "../../triggers/video-failed.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-endpoint-secret-0123456789abcdef";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Independent of app code: node:crypto, hex HMAC-SHA256 of the exact body.
const sign = (body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(body).digest("hex");

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const body = (type: string) =>
  `{ "event_id":"evt_1",  "event_type" : "${type}",
  "event_data": { "video_id":"vid_1", "url":"https://files.example.test/v.mp4",
    "video_page_url":"https://app.example.test/videos/vid_1", "callback_id":"mine-1" },
  "created_at":"2026-11-10T12:05:00Z" }`;

const call = (
  b: string | null,
  over: { headers?: Record<string, string>; method?: string; omitRaw?: boolean } = {},
  secret: string | null = SECRET,
) => ({
  raw: {
    method: over.method ?? "POST",
    path: "/",
    query: {},
    headers: over.headers ?? (b === null ? {} : { signature: sign(b) }),
    body: b === null ? null : JSON.parse(b),
    ...(b === null || over.omitRaw ? {} : { rawBody: b }),
  },
  params: {},
  state: secret === null ? { endpointId: "ep_1" } : { endpointId: "ep_1", secret },
  subscriptionId: "sub_1",
});

type Ingest = (typeof videoCompleted)["handleIngest"];
const run = (t: { handleIngest?: Ingest }, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  const b = body("avatar_video.success");
  assert(JSON.stringify(JSON.parse(b)) !== b);
});

test("app declares both webhook triggers with output and sample, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key), ["video-completed", "video-failed"]);
  for (const t of [videoCompleted, videoFailed]) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
  }
});

const cases = [
  { t: videoCompleted, type: "avatar_video.success", other: "avatar_video.fail" },
  { t: videoFailed, type: "avatar_video.fail", other: "avatar_video.success" },
];

for (const { t, type, other } of cases) {
  test(`${type}: valid signature over a non-canonical body → one normalised event`, async () => {
    const out = evs(await run(t, call(body(type)))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].eventType, type);
    assertEquals(out[0].eventId, "evt_1");
    assertEquals(out[0].videoId, "vid_1");
    assertEquals(out[0].videoUrl, "https://files.example.test/v.mp4");
    assertEquals(out[0].callbackId, "mine-1");
    assertEquals(out[0].createdAt, "2026-11-10T12:05:00Z");
  });

  test(`${type}: an event of the other type is acknowledged without a run`, async () => {
    assertEquals(evs(await run(t, call(body(other)))), []);
  });

  test(`${type}: one flipped byte in the body → throws`, async () => {
    const b = body(type);
    const input = call(b.replace("vid_1", "vid_2"), { headers: { signature: sign(b) } });
    await assertRejects(() => run(t, input), Error, "signature does not match");
  });

  test(`${type}: signature header missing → throws`, async () => {
    await assertRejects(() => run(t, call(body(type), { headers: {} })), Error, "signature header");
  });

  test(`${type}: rawBody absent → throws`, async () => {
    await assertRejects(() => run(t, call(body(type), { omitRaw: true })), Error, "raw body");
  });

  test(`${type}: no stored secret or an empty one → refused before any compare`, async () => {
    await assertRejects(() => run(t, call(body(type), {}, null)), Error, "secret");
    await assertRejects(() => run(t, call(body(type), {}, "")), Error, "secret");
    await assertRejects(
      () => run(t, call(body(type), { headers: { signature: "" } }, "")),
      Error,
      "secret",
    );
  });

  test(`${type}: signature made with another secret → throws`, async () => {
    const b = body(type);
    await assertRejects(
      () => run(t, call(b, { headers: { signature: sign(b, "other-secret") } })),
      Error,
      "signature does not match",
    );
  });
}

test("an upper-case hex signature still verifies; a base64 one does not", async () => {
  const b = body("avatar_video.success");
  const upper = sign(b).toUpperCase();
  assertEquals(
    evs(await run(videoCompleted, call(b, { headers: { signature: upper } }))).length,
    1,
  );
  const b64 = createHmac("sha256", SECRET).update(b).digest("base64");
  await assertRejects(
    () => run(videoCompleted, call(b, { headers: { signature: b64 } })),
    Error,
    "signature does not match",
  );
});

test("a signed body that is not JSON or not a HeyGen event throws; a GET is refused", async () => {
  const notJson = "no json here";
  const input = call(body("avatar_video.success"));
  const bad = {
    ...input,
    raw: { ...input.raw, rawBody: notJson, headers: { signature: sign(notJson) } },
  };
  await assertRejects(() => run(videoCompleted, bad), Error, "not JSON");
  await assertRejects(() => run(videoCompleted, call('{ "a" : 1 }')), Error, "event_type");
  await assertRejects(
    () => run(videoCompleted, call(body("avatar_video.success"), { method: "GET" })),
    Error,
    "POST",
  );
});

test("errors never echo the secret, the signature or the body", async () => {
  const b = body("avatar_video.success");
  const bad = sign(b, "other-secret");
  try {
    await run(videoCompleted, call(b, { headers: { signature: bad } }));
    assert(false, "should have thrown");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(bad) && !m.includes(sign(b)) && !m.includes("vid_1"));
  }
});

test("onSubscribe POSTs the callback URL and one event type, and keeps endpoint id + secret", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ endpoint_id: "ep_9", secret: SECRET }) }]);
  const state = await videoCompleted.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { endpointId: "ep_9", secret: SECRET });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/webhooks/endpoints");
  assertEquals(JSON.parse(calls[0].body!), { url: CALLBACK, events: ["avatar_video.success"] });
});

test("onSubscribe for the failure trigger registers avatar_video.fail", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ endpoint_id: "ep_9", secret: SECRET }) }]);
  await videoFailed.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).events, ["avatar_video.fail"]);
});

test("onSubscribe without a returned secret removes the endpoint and fails", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ endpoint_id: "ep_9", secret: null }) },
    { status: 200, body: envelope({}) },
  ]);
  await assertRejects(
    () =>
      videoCompleted.onSubscribe!(
        { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "signing secret",
  );
  assertEquals(calls.map((c) => c.method), ["POST", "DELETE"]);
  assertEquals(new URL(calls[1].url).pathname, "/v3/webhooks/endpoints/ep_9");
});

test("onUnsubscribe DELETEs the endpoint; 404 counts as gone, other errors propagate", async () => {
  const state = { endpointId: "ep_9", secret: SECRET };
  const ok = mockCtx([{ status: 200, body: envelope({}) }]);
  await videoCompleted.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, ok.ctx);
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(new URL(ok.calls[0].url).pathname, "/v3/webhooks/endpoints/ep_9");

  const gone = mockCtx([{ status: 404, body: errorBody("not_found", "no such endpoint") }]);
  await videoCompleted.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, gone.ctx);

  const boom = mockCtx([{ status: 500, body: errorBody("internal", "boom") }]);
  await assertRejects(
    () => videoCompleted.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, boom.ctx),
    Error,
    "HeyGen 500",
  );

  const none = mockCtx([]);
  await videoCompleted.onUnsubscribe!(
    { params: {}, state: undefined, subscriptionId: "s" },
    none.ctx,
  );
  assertEquals(none.calls.length, 0);
});
