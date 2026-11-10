import { test } from "node:test";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockZendeskCtx } from "../_helpers.ts";
import newTicket from "../../triggers/new-ticket.ts";
import ticketStatusChanged from "../../triggers/ticket-status-changed.ts";
import ticketCommentAdded from "../../triggers/ticket-comment-added.ts";

const SECRET = "dw8vJM1zyx3ZJRWUAEvUrULMS3IwjnMIO8ajtatR";
const STATE = {
  webhookId: "01FJ",
  eventType: "zen:event-type:ticket.created",
  signingSecret: SECRET,
};

/** Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY. */
const BODY =
  '{ "type": "zen:event-type:ticket.created",  "id": "evt-1",\n  "account_id": 18763612, "time": "2025-01-08T10:12:07Z",\n  "subject": "zen:ticket:5158", "detail": { "id": "5158", "status": "OPEN" },  "event": { } }';

/** Narrow the `E[] | { events, response? }` union (brief §3). */
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** Expected signature, computed independently of the app: base64(HMAC-SHA256(secret, ts + body)). */
const sign = (ts: string, body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(ts + body).digest("base64");

const nowIso = () => new Date().toISOString();

function call(
  headers: Record<string, string>,
  rawBody: string | null = BODY,
  method = "POST",
): TriggerCall {
  const raw: TriggerCall = { method, path: "/hook", query: {}, headers, body: null };
  if (rawBody !== null) {
    raw.rawBody = rawBody;
    raw.body = JSON.parse(rawBody);
  }
  return raw;
}

function signed(ts = nowIso(), body = BODY): Record<string, string> {
  return {
    "x-zendesk-webhook-signature": sign(ts, body),
    "x-zendesk-webhook-signature-timestamp": ts,
  };
}

async function ingest(raw: TriggerCall, state: unknown = STATE, trigger = newTicket) {
  const { ctx } = mockZendeskCtx();
  return await trigger.handleIngest!(
    { raw, params: {}, state: state as typeof STATE, subscriptionId: "sub-1" },
    ctx,
  );
}

const refusal = (text: string) => (e: Error) => {
  assert(/refused/.test(e.message) || /raw body/.test(e.message), `unexpected: ${e.message}`);
  assert(!e.message.includes(SECRET), "error echoes the secret");
  assert(!e.message.includes(text), "error echoes a header value");
  return true;
};

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("handleIngest: a valid signature over the exact bytes yields the event", async () => {
  const out = evs(await ingest(call(signed())));
  assertEquals(out.length, 1);
  assertEquals(out[0], {
    eventId: "evt-1",
    type: "zen:event-type:ticket.created",
    time: "2025-01-08T10:12:07Z",
    accountId: "18763612",
    ticketId: "5158",
    subject: "zen:ticket:5158",
    detail: { id: "5158", status: "OPEN" },
    event: {},
  });
});

test("handleIngest: a one-byte change to the body throws", async () => {
  const ts = nowIso();
  const headers = signed(ts);
  const tampered = BODY.replace("OPEN", "OPEM");
  await assertRejects(() => ingest(call(headers, tampered)), Error, "refused");
});

test("handleIngest: a flipped signature byte throws", async () => {
  const ts = nowIso();
  const good = sign(ts, BODY);
  const bad = (good[0] === "A" ? "B" : "A") + good.slice(1);
  const err = await assertRejects(() =>
    ingest(call({
      "x-zendesk-webhook-signature": bad,
      "x-zendesk-webhook-signature-timestamp": ts,
    }))
  );
  assert(refusal(bad)(err));
});

test("handleIngest: a signature made with another secret throws", async () => {
  const ts = nowIso();
  await assertRejects(
    () =>
      ingest(call({
        "x-zendesk-webhook-signature": sign(ts, BODY, "another-secret"),
        "x-zendesk-webhook-signature-timestamp": ts,
      })),
    Error,
    "refused",
  );
});

test("handleIngest: a signature over the re-serialised body does not verify", async () => {
  const ts = nowIso();
  const reserialised = JSON.stringify(JSON.parse(BODY));
  await assertRejects(
    () =>
      ingest(call({
        "x-zendesk-webhook-signature": sign(ts, reserialised),
        "x-zendesk-webhook-signature-timestamp": ts,
      })),
    Error,
    "refused",
  );
});

test("handleIngest: a missing signature header throws", async () => {
  const ts = nowIso();
  await assertRejects(
    () => ingest(call({ "x-zendesk-webhook-signature-timestamp": ts })),
    Error,
    "refused",
  );
});

test("handleIngest: a missing timestamp header throws", async () => {
  await assertRejects(
    () => ingest(call({ "x-zendesk-webhook-signature": sign(nowIso(), BODY) })),
    Error,
    "refused",
  );
});

test("handleIngest: an absent rawBody throws", async () => {
  await assertRejects(() => ingest(call(signed(), null)), Error, "raw body");
});

test("handleIngest: a stale or future timestamp throws", async () => {
  for (const offsetMs of [-10 * 60_000, 10 * 60_000]) {
    const ts = new Date(Date.now() + offsetMs).toISOString();
    await assertRejects(() => ingest(call(signed(ts))), Error, "refused");
  }
});

test("handleIngest: an unparseable timestamp throws even when it signs correctly", async () => {
  await assertRejects(() => ingest(call(signed("yesterday"))), Error, "refused");
});

test("handleIngest: an unset or empty secret refuses even with an absent or empty header", async () => {
  const noHeaders = call({});
  const emptyHeaders = call({
    "x-zendesk-webhook-signature": "",
    "x-zendesk-webhook-signature-timestamp": nowIso(),
  });
  for (const state of [null, {}, { ...STATE, signingSecret: "" }]) {
    for (const raw of [noHeaders, emptyHeaders, call(signed())]) {
      await assertRejects(() => ingest(raw, state), Error, "secret");
    }
  }
});

test("handleIngest: a non-POST delivery throws", async () => {
  await assertRejects(() => ingest(call(signed(), null, "GET")), Error, "POST");
});

test("handleIngest: a verified delivery of another event type is acknowledged, not emitted", async () => {
  const out = evs(await ingest(call(signed()), STATE, ticketStatusChanged));
  assertEquals(out, []);
});

test("handleIngest: a verified body that is not JSON throws a body error", async () => {
  const ts = nowIso();
  const body = "not json {";
  const { ctx } = mockZendeskCtx();
  const raw: TriggerCall = {
    method: "POST",
    path: "/h",
    query: {},
    headers: signed(ts, body),
    body,
    rawBody: body,
  };
  await assertRejects(
    async () =>
      await newTicket.handleIngest!({ raw, params: {}, state: STATE, subscriptionId: "s" }, ctx),
    Error,
    "not valid JSON",
  );
});

test("triggers: each declares output, sample and webhook hooks", () => {
  for (const t of [newTicket, ticketStatusChanged, ticketCommentAdded]) {
    assert((t.output as unknown[]).length > 0, `${t.key} output`);
    assert(t.sample !== undefined, `${t.key} sample`);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
    assertEquals(typeof t.handleIngest, "function");
    assertEquals(t.poll, undefined);
  }
});

test("onSubscribe: registers an event-subscription webhook and keeps its signing secret", async () => {
  const { ctx, calls } = mockZendeskCtx([
    { body: { webhooks: [] } },
    { status: 201, body: { webhook: { id: "01FJ" } } },
    { body: { signing_secret: { algorithm: "SHA256", secret: SECRET } } },
  ]);
  const state = await newTicket.onSubscribe!(
    {
      params: {},
      subscriptionId: "sub-1",
      callbackUrl: "https://w6w.example/hook/abc",
      hostUrl: "https://w6w.example",
    },
    ctx,
  );
  assertEquals(state, {
    webhookId: "01FJ",
    eventType: "zen:event-type:ticket.created",
    signingSecret: SECRET,
  });
  assertEquals(calls.length, 3);
  assertEquals(calls[0].method, "GET");
  const list = new URL(calls[0].url);
  assertEquals(list.pathname, "/api/v2/webhooks");
  assertEquals(list.searchParams.get("filter[name_contains]"), "w6w sub-1");
  assertEquals(calls[1].method, "POST");
  assertEquals(calls[1].url, "https://acme.zendesk.com/api/v2/webhooks");
  assertEquals(JSON.parse(calls[1].body!), {
    webhook: {
      name: "w6w sub-1",
      status: "active",
      endpoint: "https://w6w.example/hook/abc",
      http_method: "POST",
      request_format: "json",
      subscriptions: ["zen:event-type:ticket.created"],
    },
  });
  assertEquals(calls[2].method, "GET");
  assertEquals(calls[2].url, "https://acme.zendesk.com/api/v2/webhooks/01FJ/signing_secret");
});

test("onSubscribe: deletes a leftover webhook that already carries the callback URL", async () => {
  const { ctx, calls } = mockZendeskCtx([
    {
      body: {
        webhooks: [
          { id: "OLD1", endpoint: "https://w6w.example/hook/abc" },
          { id: "OTHER", endpoint: "https://elsewhere.example/hook" },
        ],
      },
    },
    { status: 204 },
    { status: 201, body: { webhook: { id: "NEW1" } } },
    { body: { signing_secret: { secret: SECRET } } },
  ]);
  await newTicket.onSubscribe!(
    {
      params: {},
      subscriptionId: "sub-1",
      callbackUrl: "https://w6w.example/hook/abc",
      hostUrl: "https://w6w.example",
    },
    ctx,
  );
  assertEquals(calls[1].method, "DELETE");
  assertEquals(calls[1].url, "https://acme.zendesk.com/api/v2/webhooks/OLD1");
  assertEquals(calls.filter((c) => c.method === "DELETE").length, 1);
});

test("onSubscribe: a failed signing-secret read removes the webhook it just created", async () => {
  const { ctx, calls } = mockZendeskCtx([
    { body: { webhooks: [] } },
    { status: 201, body: { webhook: { id: "NEW1" } } },
    { status: 403, body: { errors: [{ code: "Forbidden" }] } },
    { status: 204 },
  ]);
  await assertRejects(
    () =>
      newTicket.onSubscribe!(
        { params: {}, subscriptionId: "s", callbackUrl: "https://w6w.example/h", hostUrl: "" },
        ctx,
      ),
    Error,
    "403",
  );
  assertEquals(calls[3].method, "DELETE");
  assertEquals(calls[3].url, "https://acme.zendesk.com/api/v2/webhooks/NEW1");
});

test("onUnsubscribe: deletes the webhook; 404 and 410 count as already gone", async () => {
  for (const status of [204, 404, 410]) {
    const { ctx, calls } = mockZendeskCtx([{ status, body: status === 204 ? undefined : "gone" }]);
    await newTicket.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, ctx);
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, "DELETE");
    assertEquals(calls[0].url, "https://acme.zendesk.com/api/v2/webhooks/01FJ");
  }
});

test("onUnsubscribe: any other failure propagates; no state means no call", async () => {
  const failing = mockZendeskCtx([{ status: 500, body: "boom" }]);
  await assertRejects(
    () => newTicket.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, failing.ctx),
    Error,
    "500",
  );
  const idle = mockZendeskCtx();
  await newTicket.onUnsubscribe!(
    { params: {}, state: undefined as unknown as typeof STATE, subscriptionId: "s" },
    idle.ctx,
  );
  assertEquals(idle.calls.length, 0);
});
