import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import activityCreated from "../../triggers/activity-created.ts";
import activityUpdated from "../../triggers/activity-updated.ts";
import activityDeleted from "../../triggers/activity-deleted.ts";

const TOKEN = "verify-token-0123456789abcdef";
const CHALLENGE = "15f7d1a91c1f40f8a748fd134752feb3";
const callbackUrl = "https://hooks.example.test/strava/sub_1";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const call = async (trigger: typeof activityCreated, input: {
  method: string;
  query?: Record<string, string>;
  body?: unknown;
  params?: Record<string, unknown>;
}) =>
  await trigger.handleIngest!({
    raw: {
      method: input.method,
      path: "",
      query: input.query ?? {},
      headers: {},
      body: input.body ?? null,
    },
    params: input.params ?? { verifyToken: TOKEN },
    state: { callbackUrl },
    subscriptionId: "sub",
  }, mockCtx().ctx);

const handshake = (token: string | undefined, extra: Record<string, string> = {}) => ({
  method: "GET",
  query: {
    "hub.mode": "subscribe",
    "hub.challenge": CHALLENGE,
    ...(token === undefined ? {} : { "hub.verify_token": token }),
    ...extra,
  },
});

const event = {
  aspect_type: "create",
  event_time: 1516126040,
  object_id: 1360128428,
  object_type: "activity",
  owner_id: 134815,
  subscription_id: 120475,
  updates: {},
};

test("strava: onSubscribe is a no-call manual receiver and unsubscribe is a no-op", async () => {
  const m = mockCtx();
  const state = await activityCreated.onSubscribe!(
    { params: { verifyToken: TOKEN }, callbackUrl, subscriptionId: "sub", hostUrl: "https://h" },
    m.ctx,
  );
  assertEquals(state, { callbackUrl });
  await activityCreated.onUnsubscribe!({ params: {}, state, subscriptionId: "sub" }, m.ctx);
  assertEquals(m.calls.length, 0);
});

test("strava: handshake echoes hub.challenge as JSON only after the verify token matches", async () => {
  const result = await call(activityCreated, handshake(TOKEN));
  assertEquals(evs(result), []);
  assertEquals((result as { response?: unknown }).response, {
    status: 200,
    headers: { "content-type": "application/json" },
    body: `{"hub.challenge":"${CHALLENGE}"}`,
  });
});

test("strava: handshake refuses a wrong, absent or empty token and never echoes it", async () => {
  for (const token of ["wrong-token", TOKEN + "x", "", undefined]) {
    const err = await assertRejects(() => call(activityCreated, handshake(token)));
    assertEquals(err.message.includes(TOKEN), false);
    assertEquals(err.message.includes("wrong-token"), false);
  }
});

test("strava: an unset or empty configured token refuses even an absent/empty token", async () => {
  for (const params of [{}, { verifyToken: "" }, { verifyToken: undefined }]) {
    for (const token of [undefined, ""]) {
      const err = await assertRejects(() => call(activityCreated, { ...handshake(token), params }));
      assertEquals(err.message.includes("secret"), true);
    }
  }
});

test("strava: handshake refuses a missing or oversized challenge and a non-subscribe mode", async () => {
  const noChallenge = handshake(TOKEN);
  delete noChallenge.query["hub.challenge"];
  await assertRejects(() => call(activityCreated, noChallenge));
  await assertRejects(() =>
    call(activityCreated, handshake(TOKEN, { "hub.challenge": "x".repeat(257) }))
  );
  await assertRejects(() => call(activityCreated, handshake(TOKEN, { "hub.mode": "unsubscribe" })));
});

test("strava: a delivery for the watched object and aspect becomes one event", async () => {
  const body = JSON.stringify(event);
  for (const b of [event, body]) {
    assertEquals(evs(await call(activityCreated, { method: "POST", body: b })), [{
      aspectType: "create",
      objectType: "activity",
      objectId: 1360128428,
      ownerId: 134815,
      eventTime: 1516126040,
      subscriptionId: 120475,
      updates: {},
    }]);
  }
});

test("strava: each trigger fires only on its own aspect and object", async () => {
  const update = { ...event, aspect_type: "update", updates: { title: "Messy" } };
  assertEquals(evs(await call(activityCreated, { method: "POST", body: update })), []);
  assertEquals(evs(await call(activityDeleted, { method: "POST", body: update })), []);
  const updated = evs(await call(activityUpdated, { method: "POST", body: update }));
  assertEquals(updated.length, 1);
  assertEquals((updated[0] as { updates: unknown }).updates, { title: "Messy" });
  const del = { ...event, aspect_type: "delete" };
  assertEquals(evs(await call(activityDeleted, { method: "POST", body: del })).length, 1);
  const athlete = { ...event, object_type: "athlete", updates: { authorized: "false" } };
  assertEquals(evs(await call(activityUpdated, { method: "POST", body: athlete })), []);
});

test("strava: the athlete filter drops other athletes' events", async () => {
  const mine = { method: "POST", body: event, params: { verifyToken: TOKEN, ownerId: "134815" } };
  assertEquals(evs(await call(activityCreated, mine)).length, 1);
  const other = { ...mine, params: { verifyToken: TOKEN, ownerId: "999" } };
  assertEquals(evs(await call(activityCreated, other)), []);
});

test("strava: a malformed delivery or an unexpected method throws", async () => {
  await assertRejects(() => call(activityCreated, { method: "POST", body: {} }));
  await assertRejects(() => call(activityCreated, { method: "POST", body: "not json" }));
  await assertRejects(() => call(activityCreated, { method: "POST", body: null }));
  await assertRejects(() => call(activityCreated, { method: "PUT", body: event }));
});

test("strava: every trigger declares output and a sample, with the verify token as a secret", () => {
  for (const t of [activityCreated, activityUpdated, activityDeleted]) {
    assertEquals(Array.isArray(t.output) && t.output.length > 0, true);
    assertEquals(t.sample !== undefined, true);
    const verify = t.params!.find((p) => p.key === "verifyToken");
    assertEquals([verify?.type, verify?.required], ["secret", true]);
  }
});
