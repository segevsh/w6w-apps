import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import { quoteBigInts } from "../../lib/triggers.ts";
import registrantAdded from "../../triggers/registrant-added.ts";
import registrantJoined from "../../triggers/registrant-joined.ts";
import webinarCreated from "../../triggers/webinar-created.ts";
import webinarChanged from "../../triggers/webinar-changed.ts";
import surveySubmitted from "../../triggers/survey-submitted.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-webhook-secret-key-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Independent of app code: node:crypto, base64 HMAC-SHA256 of "<timestamp>:<exact body>".
const sign = (ts: string, body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(`${ts}:${body}`).digest("base64");

// Non-canonical whitespace AND an id above 2^53 (JSON.parse would round it).
const body = (eventName: string) =>
  `{ "eventName" : "${eventName}",  "eventVersion":"1.0.0", "product":"g2w",
  "eventKey":"74d38461-9db8-4e41-8f59-d99f00b82411", "sessionKey":15887209,
  "webinarKey":5620084814059709442, "firstName":"Ada", "lastName":"Lovelace",
  "email":"ada@example.com", "webinarTitle":"Intro: 12345678901234567, really",
  "registrantKey":8325357307900339981, "timestamp":"2026-11-10T10:00:04.517Z" }`;

const call = (
  b: string | null,
  over: { headers?: Record<string, string>; method?: string; omitRaw?: boolean; ts?: string } = {},
  secret: string | null = SECRET,
) => {
  const ts = over.ts ?? String(Date.now());
  return {
    raw: {
      method: over.method ?? "POST",
      path: "/",
      query: {},
      headers: over.headers ?? (b === null ? {} : {
        "x-webhook-signature": sign(ts, b),
        "x-webhook-signature-timestamp": ts,
        "x-webhook-signature-version": "0",
        "x-webhook-secretkey-id": "1",
      }),
      body: b === null ? null : JSON.parse(b),
      ...(b === null || over.omitRaw ? {} : { rawBody: b }),
    },
    params: { signingSecret: secret === null ? undefined : secret },
    state: { webhookKey: "wk-1", userSubscriptionKey: "us-1" },
    subscriptionId: "sub_1",
  };
};

type Ingest = (typeof registrantAdded)["handleIngest"];
const run = (t: { handleIngest?: Ingest }, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

const cases = [
  {
    t: registrantAdded,
    key: "registrant-added",
    name: "registrant.added",
    other: "registrant.joined",
  },
  {
    t: registrantJoined,
    key: "registrant-joined",
    name: "registrant.joined",
    other: "webinar.created",
  },
  { t: webinarCreated, key: "webinar-created", name: "webinar.created", other: "webinar.changed" },
  { t: webinarChanged, key: "webinar-changed", name: "webinar.changed", other: "survey.submitted" },
  {
    t: surveySubmitted,
    key: "survey-submitted",
    name: "survey.submitted",
    other: "registrant.added",
  },
];

test("fixture body has non-canonical whitespace and an id the double cannot hold", () => {
  const b = body("registrant.added");
  assert(JSON.stringify(JSON.parse(b)) !== b);
  assert(String(JSON.parse(b).webinarKey) !== "5620084814059709442");
});

test("app declares the five webhook triggers with output and sample, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key).slice(0, 5), cases.map((c) => c.key));
  for (const { t } of cases) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
    assertEquals(t.params!.find((p) => p.key === "signingSecret")!.type, "secret");
  }
});

for (const { t, name, other } of cases) {
  test(`${name}: valid signature → one event with the exact big-integer ids`, async () => {
    const out = evs(await run(t, call(body(name)))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].eventName, name);
    assertEquals(out[0].webinarKey, "5620084814059709442");
    assertEquals(out[0].registrantKey, "8325357307900339981");
    assertEquals(out[0].sessionKey, "15887209");
    assertEquals(out[0].webinarTitle, "Intro: 12345678901234567, really");
    assertEquals(out[0].email, "ada@example.com");
    assertEquals(out[0].eventKey, "74d38461-9db8-4e41-8f59-d99f00b82411");
  });

  test(`${name}: a verified event of another name is acknowledged without a run`, async () => {
    assertEquals(evs(await run(t, call(body(other)))), []);
  });

  test(`${name}: one flipped byte in the body → throws`, async () => {
    const b = body(name);
    const ts = String(Date.now());
    const input = call(b.replace("Ada", "Adb"), {
      headers: { "x-webhook-signature": sign(ts, b), "x-webhook-signature-timestamp": ts },
    });
    await assertRejects(async () => await run(t, input), Error, "signature does not match");
  });

  test(`${name}: signature header missing or timestamp header missing → throws`, async () => {
    const b = body(name);
    const ts = String(Date.now());
    await assertRejects(
      async () => await run(t, call(b, { headers: { "x-webhook-signature-timestamp": ts } })),
      Error,
      "headers are missing",
    );
    await assertRejects(
      async () => await run(t, call(b, { headers: { "x-webhook-signature": sign(ts, b) } })),
      Error,
      "headers are missing",
    );
    await assertRejects(
      async () => await run(t, call(b, { headers: {} })),
      Error,
      "headers are missing",
    );
  });

  test(`${name}: rawBody absent → throws`, async () => {
    await assertRejects(
      async () => await run(t, call(body(name), { omitRaw: true })),
      Error,
      "raw body",
    );
  });

  test(`${name}: unset or empty secret → refused before any compare`, async () => {
    await assertRejects(async () => await run(t, call(body(name), {}, null)), Error, "secret");
    await assertRejects(async () => await run(t, call(body(name), {}, "")), Error, "secret");
    await assertRejects(
      async () =>
        await run(
          t,
          call(body(name), {
            headers: { "x-webhook-signature": "", "x-webhook-signature-timestamp": "" },
          }, ""),
        ),
      Error,
      "secret",
    );
  });

  test(`${name}: stale and future timestamps (validly signed) → throw`, async () => {
    const b = body(name);
    for (const delta of [-10 * 60_000, 10 * 60_000]) {
      const ts = String(Date.now() + delta);
      await assertRejects(
        async () => await run(t, call(b, { ts })),
        Error,
        "outside the allowed window",
      );
    }
  });

  test(`${name}: signature made with another secret → throws`, async () => {
    const b = body(name);
    const ts = String(Date.now());
    await assertRejects(
      async () =>
        await run(
          t,
          call(b, {
            headers: {
              "x-webhook-signature": sign(ts, b, "other-secret"),
              "x-webhook-signature-timestamp": ts,
            },
          }),
        ),
      Error,
      "signature does not match",
    );
  });
}

test("the signature covers the timestamp: a replayed signature with a fresh timestamp fails", async () => {
  const b = body("registrant.added");
  const old = String(Date.now() - 60_000);
  const fresh = String(Date.now());
  await assertRejects(
    async () =>
      await run(
        registrantAdded,
        call(b, {
          headers: { "x-webhook-signature": sign(old, b), "x-webhook-signature-timestamp": fresh },
        }),
      ),
    Error,
    "signature does not match",
  );
});

test("an unknown signature version, a non-numeric timestamp and a hex signature are refused", async () => {
  const b = body("registrant.added");
  const ts = String(Date.now());
  const base = { "x-webhook-signature": sign(ts, b), "x-webhook-signature-timestamp": ts };
  await assertRejects(
    async () =>
      await run(
        registrantAdded,
        call(b, { headers: { ...base, "x-webhook-signature-version": "1" } }),
      ),
    Error,
    "version",
  );
  await assertRejects(
    async () =>
      await run(
        registrantAdded,
        call(b, { headers: { ...base, "x-webhook-signature-timestamp": "soon" } }),
      ),
    Error,
    "outside the allowed window",
  );
  const hex = createHmac("sha256", SECRET).update(`${ts}:${b}`).digest("hex");
  await assertRejects(
    async () =>
      await run(registrantAdded, call(b, { headers: { ...base, "x-webhook-signature": hex } })),
    Error,
    "signature does not match",
  );
});

test("the unsigned GET GoTo uses to validate the callback URL answers with no events", async () => {
  assertEquals(evs(await run(registrantAdded, call(null, { method: "GET" }))), []);
});

test("other methods are refused; a signed non-JSON body and a non-event body throw", async () => {
  await assertRejects(
    async () => await run(registrantAdded, call(body("registrant.added"), { method: "PUT" })),
    Error,
    "POST",
  );
  const notJson = "no json";
  const ts = String(Date.now());
  const input = call(body("registrant.added"));
  const bad = {
    ...input,
    raw: {
      ...input.raw,
      rawBody: notJson,
      headers: { "x-webhook-signature": sign(ts, notJson), "x-webhook-signature-timestamp": ts },
    },
  };
  await assertRejects(async () => await run(registrantAdded, bad), Error, "not JSON");
  await assertRejects(
    async () => await run(registrantAdded, call('{ "a" : 1 }')),
    Error,
    "eventName",
  );
});

test("errors never echo the secret, the signature, the timestamp or the body", async () => {
  const b = body("registrant.added");
  const ts = String(Date.now());
  const bad = sign(ts, b, "other-secret");
  try {
    await run(
      registrantAdded,
      call(b, { headers: { "x-webhook-signature": bad, "x-webhook-signature-timestamp": ts } }),
    );
    assert(false, "should have thrown");
  } catch (e) {
    const m = (e as Error).message;
    assert(
      !m.includes(SECRET) && !m.includes(bad) && !m.includes(sign(ts, b)) && !m.includes(ts) &&
        !m.includes("Ada"),
    );
  }
});

test("quoteBigInts quotes only 16+ digit integers outside strings", () => {
  assertEquals(
    quoteBigInts(
      '{"a":12345678901234567,"b":[-9007199254740993, 5],"c":"x 12345678901234567 y","d":1234567890123456.5,"e":1e30,"f":"q\\"12345678901234567"}',
    ),
    '{"a":"12345678901234567","b":["-9007199254740993", 5],"c":"x 12345678901234567 y","d":1234567890123456.5,"e":1e30,"f":"q\\"12345678901234567"}',
  );
});

test("onSubscribe creates, activates and subscribes through the documented endpoints", async () => {
  const { ctx, calls } = mockCtx([
    { body: { _embedded: { webhooks: [{ webhookKey: "wk-9", state: "INACTIVE" }] } } },
    { status: 204 },
    { body: { _embedded: { userSubscriptions: [{ userSubscriptionKey: "us-9" }] } } },
  ]);
  const state = await registrantAdded.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { webhookKey: "wk-9", userSubscriptionKey: "us-9" });
  assertEquals(calls.map((c) => [c.method, new URL(c.url).pathname]), [
    ["POST", "/G2W/rest/v2/webhooks"],
    ["PUT", "/G2W/rest/v2/webhooks"],
    ["POST", "/G2W/rest/v2/userSubscriptions"],
  ]);
  assertEquals(JSON.parse(calls[0].body!), [
    { callbackUrl: CALLBACK, eventName: "registrant.added", eventVersion: "1.0.0", product: "g2w" },
  ]);
  assertEquals(JSON.parse(calls[1].body!), [{ webhookKey: "wk-9", state: "ACTIVE" }]);
  assertEquals(JSON.parse(calls[2].body!), [{
    webhookKey: "wk-9",
    userSubscriptionState: "ACTIVE",
  }]);
});

test("onSubscribe registers each trigger's own event name", async () => {
  for (const { t, name } of cases) {
    const { ctx, calls } = mockCtx([
      { body: { _embedded: { webhooks: [{ webhookKey: "wk" }] } } },
      { status: 204 },
      { body: { _embedded: { userSubscriptions: [{ userSubscriptionKey: "us" }] } } },
    ]);
    await t.onSubscribe!(
      { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
      ctx,
    );
    assertEquals(JSON.parse(calls[0].body!)[0].eventName, name);
  }
});

test("onSubscribe removes the webhook again when activation or subscription fails", async () => {
  const { ctx, calls } = mockCtx([
    { body: { _embedded: { webhooks: [{ webhookKey: "wk-9" }] } } },
    { status: 403, body: { msg: "Forbidden" } },
    { status: 202 },
  ]);
  await assertRejects(
    async () =>
      await registrantAdded.onSubscribe!(
        { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "GoTo Webinar 403",
  );
  assertEquals(calls.map((c) => c.method), ["POST", "PUT", "DELETE"]);
  assertEquals(new URL(calls[2].url).pathname, "/G2W/rest/v2/webhooks");
  assertEquals(JSON.parse(calls[2].body!), ["wk-9"]);
});

test("onSubscribe fails when GoTo returns no webhook key", async () => {
  const { ctx } = mockCtx([{ body: { _embedded: { webhooks: [] } } }]);
  await assertRejects(
    async () =>
      await registrantAdded.onSubscribe!(
        { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "webhook key",
  );
});

test("onUnsubscribe deletes the subscription then the webhook; 404 is gone, others propagate", async () => {
  const state = { webhookKey: "wk-9", userSubscriptionKey: "us-9" };
  const ok = mockCtx([{ status: 202 }, { status: 202 }]);
  await registrantAdded.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, ok.ctx);
  assertEquals(ok.calls.map((c) => [c.method, new URL(c.url).pathname]), [
    ["DELETE", "/G2W/rest/v2/userSubscriptions"],
    ["DELETE", "/G2W/rest/v2/webhooks"],
  ]);
  assertEquals(JSON.parse(ok.calls[0].body!), ["us-9"]);
  assertEquals(JSON.parse(ok.calls[1].body!), ["wk-9"]);

  const gone = mockCtx([{ status: 404, body: { msg: "Not found" } }, {
    status: 404,
    body: { msg: "Not found" },
  }]);
  await registrantAdded.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, gone.ctx);
  assertEquals(gone.calls.length, 2);

  const boom = mockCtx([{ status: 500, body: { msg: "boom" } }]);
  await assertRejects(
    async () =>
      await registrantAdded.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, boom.ctx),
    Error,
    "GoTo Webinar 500",
  );

  const none = mockCtx([]);
  await registrantAdded.onUnsubscribe!(
    { params: {}, state: undefined, subscriptionId: "s" },
    none.ctx,
  );
  assertEquals(none.calls.length, 0);
});
