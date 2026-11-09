import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import created from "../../triggers/booking-created.ts";
import cancelled from "../../triggers/booking-cancelled.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "cal-webhook-secret-for-tests-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "triggerEvent" : "BOOKING_CREATED",  "createdAt":"2026-11-09T10:00:00.000Z",
  "payload": { "uid":"bk1", "bookingId":42, "title":"Intro", "type":"30min",
  "startTime":"2026-11-12T15:00:00Z", "endTime":"2026-11-12T15:30:00Z",
  "organizer":{"name":"Ada","email":"ada@example.com"}, "attendees":[{"name":"Grace","email":"g@example.com"}],
  "location":"integrations:daily", "status":"ACCEPTED" } }`;

const sig = (body = BODY, secret = SECRET) =>
  createHmac("sha256", secret).update(body).digest("hex");

const call = (over: Record<string, unknown> = {}, body: string | null = BODY) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "x-cal-signature-256": sig() } as Record<string, string>,
    body: body === null ? null : JSON.parse(body),
    ...(body === null ? {} : { rawBody: body }),
    ...over,
  },
  params: {} as Record<string, never>,
  state: { webhookId: "W1", triggerEvent: "BOOKING_CREATED", secret: SECRET } as {
    webhookId: string;
    triggerEvent: "BOOKING_CREATED";
    secret: string | undefined;
  },
  subscriptionId: "sub_1",
});

const ingest = (input: ReturnType<typeof call>, t = created) =>
  t.handleIngest!(input as never, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares three webhook triggers with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "booking-created",
    "booking-cancelled",
    "booking-rescheduled",
  ]);
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
  assertEquals(out[0].triggerEvent, "BOOKING_CREATED");
  assertEquals(out[0].bookingUid, "bk1");
  assertEquals(out[0].bookingId, "42");
  assertEquals(out[0].startTime, "2026-11-12T15:00:00Z");
});

test("a signed delivery for a different trigger event is acknowledged with no event", async () => {
  assertEquals(evs(await ingest(call(), cancelled)), []);
});

test("one flipped byte in the body → refused", async () => {
  await assertRejects(
    () => ingest(call({ rawBody: BODY.replace("Intro", "Outro") })),
    Error,
    "signature",
  );
});

test("signature under another secret → refused", async () => {
  const h = { "x-cal-signature-256": sig(BODY, "another-secret-value-xxxxxxxx") };
  await assertRejects(() => ingest(call({ headers: h })), Error, "signature");
});

test("header missing → refused", async () => {
  await assertRejects(() => ingest(call({ headers: {} })), Error, "X-Cal-Signature-256");
});

test("rawBody absent → refused, even with a correct signature", async () => {
  await assertRejects(() => ingest(call({}, null)), Error, "raw body");
});

test("unset or empty secret + absent or empty header → refused", async () => {
  for (const secret of [undefined, ""]) {
    for (const headers of [{}, { "x-cal-signature-256": "" }]) {
      const c = call({ headers });
      c.state.secret = secret;
      await assertRejects(() => ingest(c), Error, "secret");
    }
  }
});

test("errors never contain the secret, the signature or the header value", async () => {
  const h = sig(BODY, "another-secret-value-xxxxxxxx");
  try {
    await ingest(call({ headers: { "x-cal-signature-256": h } }));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(h));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(() => ingest(call({ method: "GET" })), Error, "POST");
});

test("onSubscribe POSTs /v2/webhooks with a random secret and keeps it in state", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { status: "success", data: { id: "w_7" } },
  }]);
  const state = await cancelled.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v2/webhooks");
  const sent = JSON.parse(calls[0].body!);
  assert(/^[0-9a-f]{64}$/.test(sent.secret));
  assertEquals({ ...sent, secret: "S" }, {
    subscriberUrl: CALLBACK,
    triggers: ["BOOKING_CANCELLED"],
    active: true,
    secret: "S",
  });
  assertEquals(state, { webhookId: "w_7", triggerEvent: "BOOKING_CANCELLED", secret: sent.secret });
});

test("onSubscribe fails when Cal.com returns no id", async () => {
  const { ctx } = mockCtx([{ status: 201, body: { status: "success", data: {} } }]);
  await assertRejects(
    () =>
      created.onSubscribe!(
        { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "no id",
  );
});

test("onUnsubscribe DELETEs the webhook; 404 and 410 are already gone; 500 propagates", async () => {
  const state = { webhookId: "w_7", triggerEvent: "BOOKING_CREATED" as const, secret: SECRET };
  const input = { params: {}, state, subscriptionId: "s" };
  const ok = mockCtx([{ status: 200, body: { status: "success" } }]);
  await created.onUnsubscribe!(input, ok.ctx);
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(new URL(ok.calls[0].url).pathname, "/v2/webhooks/w_7");
  for (const status of [404, 410]) {
    await created.onUnsubscribe!(input, mockCtx([{ status, body: { status: "error" } }]).ctx);
  }
  await assertRejects(() =>
    created.onUnsubscribe!(input, mockCtx([{ status: 500, body: "x" }]).ctx)
  );
});
