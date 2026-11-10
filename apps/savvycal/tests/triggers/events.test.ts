import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import created from "../../triggers/event-created.ts";
import canceled from "../../triggers/event-canceled.ts";
import rescheduled from "../../triggers/event-rescheduled.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-webhook-secret-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "type" : "event.created",  "id":"payload_P1", "occurred_at":"2026-11-10T10:30:00Z",
  "version":"2020-11-18",
  "payload": { "id":"event_E1", "summary":"30 Minute Meeting with Ada", "state":"confirmed",
  "start_at":"2026-11-20T14:00:00Z", "end_at":"2026-11-20T14:30:00Z", "duration":30,
  "link": {"id":"link_L1","name":"30 Minute Meeting"},
  "organizer": {"display_name":"Grace","email":"grace@example.com"},
  "attendees":[{"email":"ada@example.com"}], "url":"https://savvycal.com/events/event_E1",
  "cancel_reason":null, "reschedule_reason":null } }`;

// The vendor's own example is UPPERCASE hex after `sha256=`.
const sig = (body = BODY, secret = SECRET) =>
  `sha256=${createHmac("sha256", secret).update(body).digest("hex").toUpperCase()}`;

const call = (over: Record<string, unknown> = {}, body: string | null = BODY) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "x-savvycal-signature": sig(), "x-savvycal-webhook-id": "wh_1" } as Record<
      string,
      string
    >,
    body: body === null ? null : JSON.parse(body),
    ...(body === null ? {} : { rawBody: body }),
    ...over,
  },
  params: {} as Record<string, never>,
  state: { webhookId: "wh_1", secret: SECRET as string | null } as {
    webhookId: string;
    secret: string;
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
    "event-created",
    "event-canceled",
    "event-rescheduled",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0, t.key);
    assert(t.sample !== undefined, t.key);
    assertEquals(typeof t.onSubscribe, "function", t.key);
    assertEquals(typeof t.onUnsubscribe, "function", t.key);
    assertEquals(t.poll, undefined, t.key);
  }
});

test("valid signature (node:crypto, uppercase hex) → one normalized event", async () => {
  const out = evs(await ingest(call())) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].type, "event.created");
  assertEquals(out[0].eventId, "event_E1");
  assertEquals(out[0].deliveryId, "payload_P1");
  assertEquals(out[0].linkName, "30 Minute Meeting");
  assertEquals(out[0].organizerEmail, "grace@example.com");
  assertEquals(out[0].duration, 30);
});

test("lowercase hex is accepted too", async () => {
  const lower = `sha256=${createHmac("sha256", SECRET).update(BODY).digest("hex")}`;
  const c = call({ headers: { "x-savvycal-signature": lower } });
  assertEquals(evs(await ingest(c)).length, 1);
});

test("a signed delivery of another type is acknowledged with no event", async () => {
  assertEquals(evs(await ingest(call(), canceled)), []);
  assertEquals(evs(await ingest(call(), rescheduled)), []);
});

test("the canceled trigger picks event.canceled", async () => {
  const body = BODY.replace("event.created", "event.canceled");
  const c = call({ rawBody: body, headers: { "x-savvycal-signature": sig(body) } });
  assertEquals(evs(await ingest(c, canceled)).length, 1);
  assertEquals(evs(await ingest(c, created)), []);
});

test("one flipped byte in the body → refused", async () => {
  await assertRejects(
    () => ingest(call({ rawBody: BODY.replace("Ada", "Eve") })),
    Error,
    "signature",
  );
});

test("signature under another secret → refused", async () => {
  const h = { "x-savvycal-signature": sig(BODY, "some-other-secret-xxxxxxxxxxxx") };
  await assertRejects(() => ingest(call({ headers: h })), Error, "signature");
});

test("header missing or empty → refused", async () => {
  await assertRejects(() => ingest(call({ headers: {} })), Error, "x-savvycal-signature");
  await assertRejects(
    () => ingest(call({ headers: { "x-savvycal-signature": "" } })),
    Error,
    "x-savvycal-signature",
  );
});

test("rawBody absent → refused, even with a correct signature", async () => {
  await assertRejects(() => ingest(call({}, null)), Error, "raw body");
});

test("unset or empty secret + absent or empty header → refused", async () => {
  for (const secret of [null, ""] as Array<string | null>) {
    for (const headers of [{}, { "x-savvycal-signature": "" }]) {
      const c = call({ headers });
      c.state.secret = secret as string;
      await assertRejects(() => ingest(c), Error, "secret");
    }
  }
});

test("a non-POST delivery is refused", async () => {
  await assertRejects(() => ingest(call({ method: "GET" })), Error, "POST");
});

test("errors never echo the secret or the signature", async () => {
  const c = call({ headers: { "x-savvycal-signature": "sha256=DEADBEEF" } });
  try {
    await ingest(c);
    assert(false, "should have thrown");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes("DEADBEEF"));
  }
});

test("onSubscribe POSTs the callback URL to /v1/webhooks and keeps id + secret in state", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "wh_9", secret: "abc123" } }]);
  const state = await created.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { webhookId: "wh_9", secret: "abc123" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.savvycal.com/v1/webhooks");
  assertEquals(JSON.parse(calls[0].body!), { url: CALLBACK });
});

test("onSubscribe refuses a response without a secret", async () => {
  const { ctx } = mockCtx([{ status: 201, body: { id: "wh_9" } }]);
  await assertRejects(
    () =>
      created.onSubscribe!(
        { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "signing secret",
  );
});

test("onUnsubscribe DELETEs /v1/webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "wh_9", state: "deleted" } }]);
  await created.onUnsubscribe!(
    { params: {}, state: { webhookId: "wh_9", secret: "s" }, subscriptionId: "sub_1" },
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.savvycal.com/v1/webhooks/wh_9");
});

test("onUnsubscribe treats 404 and 410 as already gone and rethrows other errors", async () => {
  const gone = mockCtx([{
    status: 404,
    body: "Not found",
    headers: { "content-type": "text/plain" },
  }]);
  await created.onUnsubscribe!(
    { params: {}, state: { webhookId: "wh_9", secret: "s" }, subscriptionId: "sub_1" },
    gone.ctx,
  );
  const goneToo = mockCtx([{
    status: 410,
    body: "Gone",
    headers: { "content-type": "text/plain" },
  }]);
  await created.onUnsubscribe!(
    { params: {}, state: { webhookId: "wh_9", secret: "s" }, subscriptionId: "sub_1" },
    goneToo.ctx,
  );
  const bad = mockCtx([{ status: 500, body: "boom", headers: { "content-type": "text/plain" } }]);
  await assertRejects(
    () =>
      created.onUnsubscribe!(
        { params: {}, state: { webhookId: "wh_9", secret: "s" }, subscriptionId: "sub_1" },
        bad.ctx,
      ),
    Error,
    "500",
  );
});
