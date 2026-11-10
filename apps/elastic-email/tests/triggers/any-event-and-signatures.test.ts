import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "webhook-secret-for-tests-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1?v=2";
const TARGET = "/triggers/webhooks/sub_1?v=2";
const NOW = Math.floor(Date.now() / 1000);

// Every webhook trigger → the notification status it keeps (null = Any Event).
const STATUS_OF: Record<string, string | null> = {
  "email-sent": "Sent",
  "email-opened": "Opened",
  "email-clicked": "Clicked",
  "email-unsubscribed": "Unsubscribed",
  "email-error": "Error",
  "abuse-report": "AbuseReport",
  "any-event": null,
};

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const bodyFor = (status: string) =>
  `{ "transaction" : "d4f5-1",  "to":"jane@example.com", "from":"news@yourbrand.com",
  "date":"11/10/2026 9:30:00 AM", "status":"${status}", "channel":"News",
  "account":"you@yourbrand.com", "category":"Unknown", "ip":"203.0.113.7",
  "country":"Poland", "subject":"Our news", "messageid":"Xy2a-1" }`;

const sign = (ts: number | string, b: string, secret = SECRET) =>
  createHmac("sha256", secret).update(`${ts}\nPOST\n${TARGET}\n${b}`).digest("hex");

const trigger = (key: string) => {
  const t = app.triggers.find((x) => x.key === key);
  assert(t !== undefined, `trigger ${key} is declared`);
  return t!;
};

const call = (
  b: string,
  headers: Record<string, string>,
  secret: string | null = SECRET,
  over: Record<string, unknown> = {},
  params: Record<string, unknown> = {},
) => ({
  raw: {
    method: "POST",
    path: "/triggers/webhooks/sub_1",
    query: { v: "2" },
    headers,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params,
  state: secret === null ? {} : { webhookId: "wh_1", secret, callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const good = (b: string, ts = NOW) => ({
  "x-elasticemail-timestamp": String(ts),
  "x-elasticemail-signature": `v1=${sign(ts, b)}`,
});

const ingest = (key: string, input: ReturnType<typeof call>) =>
  trigger(key).handleIngest!(input as never, mockCtx().ctx);

test("the app declares every webhook trigger, the Any Event trigger and the two new polls", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "new-list",
    ...Object.keys(STATUS_OF),
    "new-template",
    "new-contact-in-list",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.onSubscribe === undefined, t.poll !== undefined);
  }
  assertEquals(trigger("any-event").params!.map((p) => p.key), ["events"]);
  assertEquals(trigger("email-sent").params, []);
});

for (const [key, status] of Object.entries(STATUS_OF)) {
  const eventStatus = status ?? "Clicked";
  const BODY = bodyFor(eventStatus);

  test(`${key}: fixture has non-canonical whitespace`, () => {
    assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
  });

  test(`${key}: valid signature → one event`, async () => {
    const out = evs(await ingest(key, call(BODY, good(BODY)))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].status, eventStatus);
    assertEquals(out[0].to, "jane@example.com");
  });

  test(`${key}: flipping a byte of the SIGNATURE itself (start, middle, end) is refused`, async () => {
    const hex = sign(NOW, BODY);
    for (const i of [0, Math.floor(hex.length / 2), hex.length - 1]) {
      const flipped = hex.slice(0, i) + (hex[i] === "0" ? "1" : "0") + hex.slice(i + 1);
      assert(flipped !== hex);
      const headers = { ...good(BODY), "x-elasticemail-signature": `v1=${flipped}` };
      await assertRejects(() => ingest(key, call(BODY, headers)), Error, "signature");
    }
  });

  test(`${key}: a flipped byte in the body, another secret or another target is refused`, async () => {
    const forged = BODY.replace("Poland", "Polanx");
    await assertRejects(() => ingest(key, call(forged, good(BODY))), Error, "signature");
    const other = { ...good(BODY), "x-elasticemail-signature": `v1=${sign(NOW, BODY, "another")}` };
    await assertRejects(() => ingest(key, call(BODY, other)), Error, "signature");
  });

  test(`${key}: signature or timestamp header missing → refused`, async () => {
    const { "x-elasticemail-signature": _s, ...noSig } = good(BODY);
    await assertRejects(() => ingest(key, call(BODY, noSig)), Error, "Signature header");
    const { "x-elasticemail-timestamp": _t, ...noTs } = good(BODY);
    await assertRejects(() => ingest(key, call(BODY, noTs)), Error, "Timestamp header");
  });

  test(`${key}: rawBody absent → refused even with a correct signature`, async () => {
    const c = call(BODY, good(BODY));
    delete (c.raw as { rawBody?: string }).rawBody;
    await assertRejects(() => ingest(key, c), Error, "raw body");
  });

  test(`${key}: unset or empty secret → refused before any compare`, async () => {
    for (const secret of [null, ""]) {
      for (const headers of [{}, good(BODY)]) {
        await assertRejects(() => ingest(key, call(BODY, headers, secret)), Error, "secret");
      }
    }
  });

  test(`${key}: a stale or future timestamp is refused even when correctly signed`, async () => {
    for (const delta of [-600, 600]) {
      await assertRejects(
        () => ingest(key, call(BODY, good(BODY, NOW + delta))),
        Error,
        "timestamp",
      );
    }
  });
}

test("each named trigger keeps only its own status", async () => {
  for (const [key, status] of Object.entries(STATUS_OF)) {
    if (status === null) continue;
    for (const other of Object.values(STATUS_OF)) {
      if (other === null || other === status) continue;
      const b = bodyFor(other);
      assertEquals(evs(await ingest(key, call(b, good(b)))), [], `${key} ignores ${other}`);
    }
  }
});

test("any-event: empty Events keeps every status; a list keeps only those named (any case)", async () => {
  const statuses = Object.values(STATUS_OF).filter((s): s is string => s !== null);
  for (const status of statuses) {
    const b = bodyFor(status);
    assertEquals(evs(await ingest("any-event", call(b, good(b)))).length, 1, status);
  }
  for (const status of statuses) {
    const b = bodyFor(status);
    const out = evs(
      await ingest("any-event", call(b, good(b), SECRET, {}, { events: " opened , ABUSEREPORT " })),
    );
    assertEquals(out.length, status === "Opened" || status === "AbuseReport" ? 1 : 0, status);
  }
});

test("any-event: onSubscribe with no Events registers all six notification types", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { WebhookID: "wh-9", SigningSecret: "secret-from-elastic" },
  }]);
  const state = await trigger("any-event").onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { webhookId: "wh-9", secret: "secret-from-elastic", callbackUrl: CALLBACK });
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v4/webhook");
  assertEquals(JSON.parse(calls[0].body!), {
    Name: "w6w-sub_1",
    URL: CALLBACK,
    NotificationForSent: true,
    NotificationForOpened: true,
    NotificationForClicked: true,
    NotificationForUnsubscribed: true,
    NotificationForAbuseReport: true,
    NotificationForError: true,
    EnableSigning: true,
    DeliveryMethod: "PostJson",
  });
});

test("any-event: onSubscribe registers just the listed notification types and refuses a bogus one", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { WebhookID: "wh-9", SigningSecret: "secret-from-elastic" },
  }]);
  await trigger("any-event").onSubscribe!(
    {
      params: { events: "Clicked, error ,clicked" },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    Name: "w6w-s",
    URL: CALLBACK,
    NotificationForClicked: true,
    NotificationForError: true,
    EnableSigning: true,
    DeliveryMethod: "PostJson",
  });
  for (const bad of ["Delivered", "constructor"]) {
    const fresh = mockCtx();
    await assertRejects(
      () =>
        trigger("any-event").onSubscribe!(
          { params: { events: bad }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
          fresh.ctx,
        ),
      Error,
      "Unknown Elastic Email notification",
    );
    assertEquals(fresh.calls.length, 0);
  }
});

test("any-event: onUnsubscribe DELETEs the webhook", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await trigger("any-event").onUnsubscribe!(
    {
      params: {},
      state: { webhookId: "wh-9", secret: "s", callbackUrl: CALLBACK },
      subscriptionId: "s",
    },
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v4/webhook/wh-9");
});
