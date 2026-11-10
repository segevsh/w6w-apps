import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import { verifySignature } from "../../lib/triggers.ts";
import emailOpened from "../../triggers/email-opened.ts";
import emailClicked from "../../triggers/email-clicked.ts";
import emailError from "../../triggers/email-error.ts";
import emailSent from "../../triggers/email-sent.ts";
import emailUnsubscribed from "../../triggers/email-unsubscribed.ts";
import abuseReport from "../../triggers/abuse-report.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "webhook-secret-for-tests-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1?v=2";
const TARGET = "/triggers/webhooks/sub_1?v=2";
const NOW = Math.floor(Date.now() / 1000);

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const body = (status = "Opened") =>
  `{ "transaction" : "d4f5-1",  "to":"jane@example.com", "from":"news@yourbrand.com",
  "date":"11/10/2026 9:30:00 AM", "status":"${status}", "channel":"News",
  "account":"you@yourbrand.com", "category":"Unknown", "ip":"203.0.113.7",
  "country":"Poland", "subject":"Our news", "messageid":"Xy2a-1" }`;

const sign = (ts: number | string, b: string, secret = SECRET, target = TARGET, method = "POST") =>
  createHmac("sha256", secret).update(`${ts}\n${method}\n${target}\n${b}`).digest("hex");

const headers = (b: string, ts: number | string = NOW, sig = `v1=${sign(ts, b)}`) => ({
  "x-elasticemail-timestamp": String(ts),
  "x-elasticemail-signature": sig,
  "x-elasticemail-webhook-id": "wh-uuid-1",
});

const call = (
  b: string,
  over: Record<string, unknown> = {},
  secret: string | undefined | null = SECRET,
) => ({
  raw: {
    method: "POST",
    path: "/triggers/webhooks/sub_1",
    query: { v: "2" },
    headers: headers(b) as Record<string, string>,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params: {},
  state: secret === null ? {} : { webhookId: "wh_1", secret, callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const ingest = (t: typeof emailOpened, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(body())) !== body());
});

test("app declares the poll trigger plus six webhook triggers with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "new-list",
    "email-sent",
    "email-opened",
    "email-clicked",
    "email-unsubscribed",
    "email-error",
    "abuse-report",
  ]);
  for (const t of app.triggers.slice(1)) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
  }
});

test("the vendor's published POST test vector verifies (secret, timestamp, target, body)", async () => {
  const b = `{"transaction":"t1"}`;
  const out = await verifySignature(
    {
      method: "POST",
      rawBody: b,
      headers: {
        "x-elasticemail-timestamp": "1700000000",
        "x-elasticemail-signature":
          "v1=3eddf396ecc5cc3256d20d0f31ec0b3ac351078e0214db59a4089a805e156da3",
      },
    },
    "whsec_test",
    "https://example.test/hook?x=1",
    1700000000_000,
  );
  assertEquals(out, b);
});

test("valid signature → one normalized event", async () => {
  const out = evs(await ingest(emailOpened, call(body()))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].status, "Opened");
  assertEquals(out[0].transaction, "d4f5-1");
  assertEquals(out[0].to, "jane@example.com");
  assertEquals(out[0].ip, "203.0.113.7");
  assertEquals(out[0].messageId, "Xy2a-1");
  assertEquals(out[0].webhookId, "wh-uuid-1");
});

test("each trigger keeps only its own status", async () => {
  const cases: Array<[typeof emailOpened, string]> = [
    [emailSent, "Sent"],
    [emailOpened, "Opened"],
    [emailClicked, "Clicked"],
    [emailUnsubscribed, "Unsubscribed"],
    [emailError, "Error"],
    [abuseReport, "AbuseReport"],
  ];
  for (const [t, status] of cases) {
    assertEquals(evs(await ingest(t, call(body(status)))).length, 1, status);
    const other = status === "Opened" ? "Sent" : "Opened";
    assertEquals(evs(await ingest(t, call(body(other)))), [], `${status} vs ${other}`);
  }
});

test("a second v1 entry may carry the match; unknown entries are ignored", async () => {
  const b = body();
  const sig = `v2=ignored, v1=${"0".repeat(64)}, v1=${sign(NOW, b)}`;
  const c = call(b, { headers: headers(b, NOW, sig) });
  assertEquals(evs(await ingest(emailOpened, c)).length, 1);
});

test("the signature covers the registered request target", async () => {
  const b = body();
  const c = call(b, { headers: headers(b, NOW, `v1=${sign(NOW, b, SECRET, "/other/path")}`) });
  await assertRejects(() => ingest(emailOpened, c), Error, "signature");
});

test("one flipped byte in the body → refused", async () => {
  const b = body();
  await assertRejects(
    () => ingest(emailOpened, call(b, { rawBody: b.replace("d4f5-1", "d4f5-2") })),
    Error,
    "signature",
  );
});

test("signature made with another secret → refused", async () => {
  const b = body();
  const c = call(b, {
    headers: headers(b, NOW, `v1=${sign(NOW, b, "another-secret-value-xxxxxxxx")}`),
  });
  await assertRejects(() => ingest(emailOpened, c), Error, "signature");
});

test("signature header missing, or timestamp header missing → refused", async () => {
  const b = body();
  await assertRejects(
    () => ingest(emailOpened, call(b, { headers: {} })),
    Error,
    "X-ElasticEmail-Signature",
  );
  await assertRejects(
    () =>
      ingest(
        emailOpened,
        call(b, { headers: { "x-elasticemail-signature": `v1=${sign(NOW, b)}` } }),
      ),
    Error,
    "X-ElasticEmail-Timestamp",
  );
});

test("rawBody absent → refused, even with a correct signature", async () => {
  const c = call(body());
  delete (c.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(emailOpened, c), Error, "raw body");
});

test("unset or empty secret + absent or empty header → refused", async () => {
  for (const secret of [null, ""]) {
    for (const h of [{}, { "x-elasticemail-signature": "" }]) {
      await assertRejects(
        () => ingest(emailOpened, call(body(), { headers: h }, secret)),
        Error,
        "secret",
      );
    }
  }
});

test("a stale or future timestamp (even correctly signed) → refused; one inside the window passes", async () => {
  const b = body();
  for (const ts of [NOW - 301, NOW + 301]) {
    await assertRejects(
      () => ingest(emailOpened, call(b, { headers: headers(b, ts) })),
      Error,
      "window",
    );
  }
  assertEquals(
    evs(await ingest(emailOpened, call(b, { headers: headers(b, NOW - 120) }))).length,
    1,
  );
});

test("errors never contain the secret, the signature or the header value", async () => {
  const b = body();
  const sig = sign(NOW, b, "another-secret-value-xxxxxxxx");
  try {
    await ingest(emailOpened, call(b, { headers: headers(b, NOW, `v1=${sig}`) }));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(sig) && !m.includes(String(NOW)));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(() => ingest(emailOpened, call(body(), { method: "GET" })), Error, "POST");
});

test("a signed body that is not a notification → refused", async () => {
  await assertRejects(
    () => ingest(emailOpened, call(`{ "hello" : "world" }`)),
    Error,
    "Not an Elastic",
  );
});

test("onSubscribe POSTs a signed JSON-delivery webhook for just its own notification", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { WebhookID: "wh-9", SigningEnabled: true, SigningSecret: "secret-from-elastic" },
  }]);
  const state = await emailClicked.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { webhookId: "wh-9", secret: "secret-from-elastic", callbackUrl: CALLBACK });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v4/webhook");
  assertEquals(JSON.parse(calls[0].body!), {
    Name: "w6w-sub_1",
    URL: CALLBACK,
    NotificationForClicked: true,
    EnableSigning: true,
    DeliveryMethod: "PostJson",
  });
});

test("each trigger switches on its own notification flag", async () => {
  const flags: Array<[typeof emailOpened, string]> = [
    [emailSent, "NotificationForSent"],
    [emailOpened, "NotificationForOpened"],
    [emailUnsubscribed, "NotificationForUnsubscribed"],
    [emailError, "NotificationForError"],
    [abuseReport, "NotificationForAbuseReport"],
  ];
  for (const [t, flag] of flags) {
    const { ctx, calls } = mockCtx([{ status: 201, body: { WebhookID: "w", SigningSecret: "s" } }]);
    await t.onSubscribe!(
      { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
      ctx,
    );
    const sent = JSON.parse(calls[0].body!);
    assertEquals(sent[flag], true);
    assertEquals(Object.keys(sent).filter((k) => k.startsWith("NotificationFor")), [flag]);
  }
});

test("onSubscribe without a returned secret deletes the webhook and refuses", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { WebhookID: "wh-9" } }, { body: {} }]);
  await assertRejects(
    () =>
      emailOpened.onSubscribe!(
        { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "signing secret",
  );
  assertEquals(calls.map((c) => c.method), ["POST", "DELETE"]);
  assertEquals(new URL(calls[1].url).pathname, "/v4/webhook/wh-9");
});

test("onSubscribe refuses an answer without a webhook id", async () => {
  const { ctx } = mockCtx([{ status: 201, body: { SigningSecret: "s" } }]);
  await assertRejects(
    () =>
      emailOpened.onSubscribe!(
        { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "id of the webhook",
  );
});

test("onUnsubscribe DELETEs the webhook; 404 and 410 are already gone; 500 propagates", async () => {
  const state = { webhookId: "wh-9", secret: "s", callbackUrl: CALLBACK };
  const ok = mockCtx([{ body: undefined }]);
  await emailOpened.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, ok.ctx);
  assertEquals(ok.calls.length, 1);
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(new URL(ok.calls[0].url).pathname, "/v4/webhook/wh-9");
  for (const status of [404, 410]) {
    const gone = mockCtx([{ status, body: { Error: "not found" } }]);
    await emailOpened.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, gone.ctx);
    assertEquals(gone.calls.length, 1);
  }
  const boom = mockCtx([{ status: 500, body: { Error: "boom" } }]);
  await assertRejects(() =>
    emailOpened.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, boom.ctx)
  );
});

test("onUnsubscribe with no stored webhook makes no call", async () => {
  const { ctx, calls } = mockCtx();
  await emailOpened.onUnsubscribe!({ params: {}, state: {}, subscriptionId: "s" }, ctx);
  assertEquals(calls.length, 0);
});
