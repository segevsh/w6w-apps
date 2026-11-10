import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, mockCtxWithOrganizer } from "../_helpers.ts";
import app from "../../index.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-webhook-secret-key-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_5";
const find = (key: string) => app.triggers.find((t) => t.key === key)!;
const anyEvent = find("any-event");

const sign = (ts: string, body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(`${ts}:${body}`).digest("base64");

const body = (eventName: string) =>
  `{ "eventName" : "${eventName}",  "eventVersion":"1.0.0", "product":"g2w",
  "eventKey":"k-1", "webinarKey":5620084814059709442, "email":"ada@example.com" }`;

function ingest(
  b: string | null,
  params: Record<string, unknown> = { signingSecret: SECRET },
  over: { headers?: Record<string, string>; omitRaw?: boolean; ts?: string } = {},
) {
  const ts = over.ts ?? String(Date.now());
  return anyEvent.handleIngest!({
    raw: {
      method: "POST",
      path: "/",
      query: {},
      headers: over.headers ?? (b === null ? {} : {
        "x-webhook-signature": sign(ts, b),
        "x-webhook-signature-timestamp": ts,
        "x-webhook-signature-version": "0",
      }),
      body: b === null ? null : JSON.parse(b),
      ...(b === null || over.omitRaw ? {} : { rawBody: b }),
    },
    params,
    state: { webhookKeys: ["wk-1"], userSubscriptionKeys: ["us-1"] },
    subscriptionId: "sub_5",
  } as never, mockCtx().ctx);
}

test("any-event: output and sample, secret param", () => {
  assert(anyEvent.output!.length > 0 && anyEvent.sample !== undefined);
  assertEquals(anyEvent.params!.map((p) => p.key), ["signingSecret", "events"]);
  assertEquals(anyEvent.params![0].type, "secret");
  assertEquals(app.triggers.map((t) => t.key).slice(5), [
    "any-event",
    "new-session",
    "new-panelist",
  ]);
});

test("any-event: valid signature -> every event when events is empty; filter narrows", async () => {
  const b = body("webinar.created");
  assert(JSON.stringify(JSON.parse(b.replace("5620084814059709442", "1"))) !== b);
  const out = evs(await ingest(b)) as Array<{ eventName: string; webinarKey: string }>;
  assertEquals(out.map((e) => [e.eventName, e.webinarKey]), [[
    "webinar.created",
    "5620084814059709442",
  ]]);
  assertEquals(evs(await ingest(b, { signingSecret: SECRET, events: "registrant.added" })), []);
  assertEquals(
    evs(await ingest(b, { signingSecret: SECRET, events: "registrant.added, webinar.created" }))
      .length,
    1,
  );
});

test("any-event: flipped signature byte, flipped body byte, missing headers, no rawBody, stale timestamp, unset secret", async () => {
  const b = body("registrant.added");
  const ts = String(Date.now());
  const sig = sign(ts, b);
  const flipped = sig.slice(0, 4) + (sig[4] === "A" ? "B" : "A") + sig.slice(5);
  const headers = (signature: string, stamp = ts) => ({
    "x-webhook-signature": signature,
    "x-webhook-signature-timestamp": stamp,
    "x-webhook-signature-version": "0",
  });
  await assertRejects(
    () => ingest(b, undefined, { headers: headers(flipped) }),
    Error,
    "signature does not match",
  );
  await assertRejects(
    () => ingest(b.replace("ada", "adb"), undefined, { headers: headers(sig) }),
    Error,
    "signature does not match",
  );
  await assertRejects(() => ingest(b, undefined, { headers: {} }), Error, "headers are missing");
  await assertRejects(() => ingest(b, undefined, { omitRaw: true }), Error, "raw body");
  const old = String(Date.now() - 20 * 60_000);
  await assertRejects(
    () => ingest(b, undefined, { headers: headers(sign(old, b), old) }),
    Error,
    "timestamp",
  );
  for (const params of [{}, { signingSecret: "" }]) {
    await assertRejects(() => ingest(b, params), Error, "secret");
  }
});

test("any-event: a GET validation probe answers with no events; bad events are refused", async () => {
  const r = await anyEvent.handleIngest!({
    raw: { method: "GET", path: "/", query: {}, headers: {}, body: null },
    params: { signingSecret: SECRET },
    state: {},
    subscriptionId: "s",
  } as never, mockCtx().ctx);
  assertEquals(evs(r), []);
  await assertRejects(
    () => ingest(body("registrant.added"), { signingSecret: SECRET, events: "bogus.event" }),
    Error,
    "Unknown GoTo Webinar event",
  );
});

test("any-event: onSubscribe registers one webhook per event (all five by default) and unsubscribes them", async () => {
  const five = [
    "registrant.added",
    "registrant.joined",
    "webinar.created",
    "webinar.changed",
    "survey.submitted",
  ];
  const keys = five.map((_, i) => `wk-${i}`);
  const { ctx, calls } = mockCtx([
    { body: { _embedded: { webhooks: keys.map((webhookKey) => ({ webhookKey })) } } },
    { status: 204 },
    {
      body: {
        _embedded: { userSubscriptions: keys.map((_, i) => ({ userSubscriptionKey: `us-${i}` })) },
      },
    },
  ]);
  const state = await anyEvent.onSubscribe!(
    { params: {}, subscriptionId: "sub_5", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { webhookKeys: keys, userSubscriptionKeys: keys.map((_, i) => `us-${i}`) });
  assertEquals(calls.map((c) => [c.method, new URL(c.url).pathname]), [
    ["POST", "/G2W/rest/v2/webhooks"],
    ["PUT", "/G2W/rest/v2/webhooks"],
    ["POST", "/G2W/rest/v2/userSubscriptions"],
  ]);
  assertEquals(
    JSON.parse(calls[0].body!),
    five.map((eventName) => ({
      callbackUrl: CALLBACK,
      eventName,
      eventVersion: "1.0.0",
      product: "g2w",
    })),
  );
  assertEquals(
    JSON.parse(calls[1].body!),
    keys.map((webhookKey) => ({ webhookKey, state: "ACTIVE" })),
  );
  const un = mockCtx([{ status: 204 }, { status: 204 }]);
  await anyEvent.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_5" }, un.ctx);
  assertEquals(un.calls.map((c) => [c.method, new URL(c.url).pathname]), [
    ["DELETE", "/G2W/rest/v2/userSubscriptions"],
    ["DELETE", "/G2W/rest/v2/webhooks"],
  ]);
  assertEquals(JSON.parse(un.calls[1].body!), keys);
});

test("any-event: a chosen event list registers only those; a missing key rolls back", async () => {
  const one = mockCtx([
    { body: { _embedded: { webhooks: [{ webhookKey: "wk-a" }] } } },
    { status: 204 },
    { body: { _embedded: { userSubscriptions: [{ userSubscriptionKey: "us-a" }] } } },
  ]);
  await anyEvent.onSubscribe!(
    {
      params: { events: "survey.submitted" },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    one.ctx,
  );
  assertEquals(JSON.parse(one.calls[0].body!).map((w: { eventName: string }) => w.eventName), [
    "survey.submitted",
  ]);
  const short = mockCtx([{ body: { _embedded: { webhooks: [{ webhookKey: "wk-a" }] } } }, {
    status: 204,
  }]);
  await assertRejects(
    () =>
      Promise.resolve(anyEvent.onSubscribe!(
        { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        short.ctx,
      )),
    Error,
    "every event",
  );
  assertEquals(short.calls[1].method, "DELETE");
});

const input = (params: Record<string, unknown>) => ({ params, subscriptionId: "s" });
const pathOf = (url: string) => new URL(url).pathname + new URL(url).search;

test("new-session: seed, one new session, idempotent, literal request", async () => {
  const t = find("new-session");
  assert(t.output!.length > 0 && t.sample !== undefined);
  const page = (...keys: string[]) => ({
    body: { _embedded: { sessionInfoResources: keys.map((sessionKey) => ({ sessionKey })) } },
  });
  const seed = mockCtxWithOrganizer([page("s1")], "org-1");
  const seeded = await t.poll!({ ...input({ webinarKey: "9" }), state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    pathOf(seed.calls[0].url),
    "/G2W/rest/v2/organizers/org-1/webinars/9/sessions?page=0&size=200",
  );
  const run = () =>
    t.poll!(
      { ...input({ webinarKey: "9" }), state: seeded.nextState },
      mockCtxWithOrganizer([page("s1", "s2")], "org-1").ctx,
    );
  const a = await run();
  assertEquals(a.events.map((e) => (e as { key: string }).key), ["s2"]);
  assertEquals(a, await run());
  await assertRejects(
    () => t.poll!({ ...input({}), state: {} }, mockCtxWithOrganizer([], "org-1").ctx),
    Error,
    "webinarKey",
  );
});

test("new-session: reads every full page of 200 before comparing", async () => {
  const t = find("new-session");
  const mk = (from: number, n: number) => ({
    body: {
      _embedded: {
        sessionInfoResources: Array.from({ length: n }, (_, i) => ({ sessionKey: `s${from + i}` })),
      },
    },
  });
  const m = mockCtxWithOrganizer([mk(0, 200), mk(200, 5)], "org-1");
  await t.poll!({ ...input({ webinarKey: "9" }), state: {} }, m.ctx);
  assertEquals(m.calls.map((c) => pathOf(c.url)), [
    "/G2W/rest/v2/organizers/org-1/webinars/9/sessions?page=0&size=200",
    "/G2W/rest/v2/organizers/org-1/webinars/9/sessions?page=1&size=200",
  ]);
});

test("new-panelist: seed, one new panelist, idempotent, literal request", async () => {
  const t = find("new-panelist");
  assert(t.output!.length > 0 && t.sample !== undefined);
  const seed = mockCtxWithOrganizer([{ body: [{ panelistId: 1, name: "A" }] }], "org-1");
  const seeded = await t.poll!({ ...input({ webinarKey: "9" }), state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(pathOf(seed.calls[0].url), "/G2W/rest/v2/organizers/org-1/webinars/9/panelists");
  const next = [{ panelistId: 1, name: "A" }, { panelistId: 2, name: "B" }];
  const run = () =>
    t.poll!(
      { ...input({ webinarKey: "9" }), state: seeded.nextState },
      mockCtxWithOrganizer([{ body: next }], "org-1").ctx,
    );
  const a = await run();
  assertEquals(a.events.map((e) => (e as { key: string }).key), ["2"]);
  assertEquals(a, await run());
});
