import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import created from "../../triggers/invitee-created.ts";
import canceled from "../../triggers/invitee-canceled.ts";
import { TOLERANCE_SEC, verifySignature } from "../../lib/triggers.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "calendly-signing-key-for-tests-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY =
  `{ "created_at":"2026-11-09T10:00:00.000000Z",  "created_by":"https://api.calendly.com/users/U1",
  "event" : "invitee.created",
  "payload": { "uri":"https://api.calendly.com/scheduled_events/E1/invitees/I1", "name":"Ada", "email":"ada@example.com",
  "status":"active", "scheduled_event": {"uri":"https://api.calendly.com/scheduled_events/E1","name":"Intro",
  "start_time":"2026-11-12T15:00:00.000000Z","end_time":"2026-11-12T15:30:00.000000Z"},
  "questions_and_answers":[{"question":"Topic?","answer":"x"}], "rescheduled":false } }`;

const nowSec = () => Math.floor(Date.now() / 1000);
const sig = (t: number, body = BODY, secret = SECRET) =>
  `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;

const call = (over: Record<string, unknown> = {}, body: string | null = BODY) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "calendly-webhook-signature": sig(nowSec()) } as Record<string, string>,
    body: body === null ? null : JSON.parse(body),
    ...(body === null ? {} : { rawBody: body }),
    ...over,
  },
  params: {} as { signingKey?: string },
  state: { webhookUuid: "W1", event: "invitee.created", scope: "organization", secret: SECRET } as {
    webhookUuid: string;
    event: "invitee.created" | "invitee.canceled";
    scope: "organization";
    secret: string | null;
  },
  subscriptionId: "sub_1",
});

const ingest = (input: ReturnType<typeof call>, t = created) =>
  t.handleIngest!(input, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares both invitee webhook triggers with output and sample", () => {
  const keys = app.triggers.map((t) => t.key);
  assertEquals(keys.slice(0, 2), ["invitee-created", "invitee-canceled"]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0, t.key);
    assert(t.sample !== undefined, t.key);
    assertEquals(typeof t.onSubscribe, "function", t.key);
    assertEquals(typeof t.onUnsubscribe, "function", t.key);
    assertEquals(t.poll, undefined, t.key);
  }
});

test("valid signature → one normalized event", async () => {
  const out = evs(await ingest(call())) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].event, "invitee.created");
  assertEquals(out[0].email, "ada@example.com");
  assertEquals(out[0].eventName, "Intro");
  assertEquals(out[0].startTime, "2026-11-12T15:00:00.000000Z");
  assertEquals(out[0].scheduledEventUri, "https://api.calendly.com/scheduled_events/E1");
});

test("a signed delivery of the other event type is acknowledged with no event", async () => {
  assertEquals(evs(await ingest(call(), canceled)), []);
});

test("one flipped byte in the body → refused", async () => {
  await assertRejects(
    () => ingest(call({ rawBody: BODY.replace("Ada", "Eve") })),
    Error,
    "signature",
  );
});

test("signature under another key → refused", async () => {
  const h = {
    "calendly-webhook-signature": sig(nowSec(), BODY, "some-other-key-xxxxxxxxxxxxxxxx"),
  };
  await assertRejects(() => ingest(call({ headers: h })), Error, "signature");
});

test("header missing → refused", async () => {
  await assertRejects(() => ingest(call({ headers: {} })), Error, "Calendly-Webhook-Signature");
});

test("malformed header (no v1, no t) → refused", async () => {
  for (const v of ["garbage", `t=${nowSec()}`, "v1=abc", "t=abc,v1=abc"]) {
    await assertRejects(
      () => ingest(call({ headers: { "calendly-webhook-signature": v } })),
      Error,
      "malformed",
    );
  }
});

test("rawBody absent → refused, even with a correct signature", async () => {
  await assertRejects(() => ingest(call({}, null)), Error, "raw body");
});

test("stale timestamp (correctly signed) → refused", async () => {
  const t = nowSec() - (TOLERANCE_SEC + 60);
  await assertRejects(
    () => ingest(call({ headers: { "calendly-webhook-signature": sig(t) } })),
    Error,
    "tolerance",
  );
});

test("timestamp window is 180 s either side", async () => {
  const now = 1_800_000_000_000;
  const t = now / 1000;
  const raw = (ts: number) => ({
    rawBody: BODY,
    headers: { "calendly-webhook-signature": sig(ts) },
  });
  assertEquals(await verifySignature(raw(t - 179), SECRET, now), BODY);
  assertEquals(await verifySignature(raw(t + 179), SECRET, now), BODY);
  await assertRejects(() => verifySignature(raw(t - 181), SECRET, now), Error, "tolerance");
  await assertRejects(() => verifySignature(raw(t + 181), SECRET, now), Error, "tolerance");
});

test("unset or empty key + absent or empty header → refused", async () => {
  for (const secret of [null, ""] as Array<string | null>) {
    for (const headers of [{}, { "calendly-webhook-signature": "" }]) {
      const c = call({ headers });
      c.state.secret = secret;
      await assertRejects(() => ingest(c), Error, "secret");
    }
  }
});

test("params.signingKey (OAuth) is the verification key when set", async () => {
  const oauthKey = "oauth-app-signing-key-0123456789abcdef";
  const c = call({
    headers: { "calendly-webhook-signature": sig(nowSec(), BODY, oauthKey) },
  });
  c.params = { signingKey: oauthKey };
  assertEquals(evs(await ingest(c)).length, 1);
  // The generated key does not verify once an OAuth key is configured.
  const d = call();
  d.params = { signingKey: oauthKey };
  await assertRejects(() => ingest(d), Error, "signature");
});

test("errors never contain the key, the signature or the header value", async () => {
  const h = sig(nowSec(), BODY, "some-other-key-xxxxxxxxxxxxxxxx");
  try {
    await ingest(call({ headers: { "calendly-webhook-signature": h } }));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(h) && !m.includes(h.split("v1=")[1]));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(() => ingest(call({ method: "GET" })), Error, "POST");
});

test("onSubscribe looks up the user then POSTs the subscription with a signing key", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        resource: {
          uri: "https://api.calendly.com/users/U1",
          current_organization: "https://api.calendly.com/organizations/O1",
        },
      },
    },
    {
      status: 201,
      body: { resource: { uri: "https://api.calendly.com/webhook_subscriptions/W9" } },
    },
  ]);
  const state = await created.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  ) as { webhookUuid: string; event: string; scope: string; secret: string };
  assertEquals(calls.length, 2);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/users/me");
  assertEquals(calls[1].method, "POST");
  assertEquals(new URL(calls[1].url).pathname, "/webhook_subscriptions");
  const sent = JSON.parse(calls[1].body!);
  assert(/^[0-9a-f]{64}$/.test(sent.signing_key));
  assertEquals({ ...sent, signing_key: "K" }, {
    url: CALLBACK,
    events: ["invitee.created"],
    organization: "https://api.calendly.com/organizations/O1",
    scope: "organization",
    signing_key: "K",
  });
  assertEquals(state, {
    webhookUuid: "W9",
    event: "invitee.created",
    scope: "organization",
    secret: sent.signing_key,
  });
});

test("onSubscribe with scope=user adds the user and, with an OAuth key, sends no signing_key", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        resource: {
          uri: "https://api.calendly.com/users/U1",
          current_organization: "https://api.calendly.com/organizations/O1",
        },
      },
    },
    {
      status: 201,
      body: { resource: { uri: "https://api.calendly.com/webhook_subscriptions/W9" } },
    },
  ]);
  const state = await canceled.onSubscribe!(
    {
      params: { scope: "user", signingKey: "oauth-key-0123456789abcdef" },
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[1].body!), {
    url: CALLBACK,
    events: ["invitee.canceled"],
    organization: "https://api.calendly.com/organizations/O1",
    scope: "user",
    user: "https://api.calendly.com/users/U1",
  });
  assertEquals((state as { secret: unknown }).secret, null);
});

test("onUnsubscribe DELETEs the subscription; 404 and 410 are already gone; 500 propagates", async () => {
  const state = {
    webhookUuid: "W9",
    event: "invitee.created" as const,
    scope: "organization" as const,
    secret: SECRET,
  };
  const input = { params: {}, state, subscriptionId: "s" };
  const ok = mockCtx([{ status: 204 }]);
  await created.onUnsubscribe!(input, ok.ctx);
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(new URL(ok.calls[0].url).pathname, "/webhook_subscriptions/W9");
  for (const status of [404, 410]) {
    await created.onUnsubscribe!(input, mockCtx([{ status, body: { title: "Not Found" } }]).ctx);
  }
  await assertRejects(() =>
    created.onUnsubscribe!(input, mockCtx([{ status: 500, body: "x" }]).ctx)
  );
});
