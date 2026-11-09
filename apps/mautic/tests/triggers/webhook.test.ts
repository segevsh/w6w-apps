import { test } from "node:test";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newContact from "../../triggers/new-contact.ts";
import contactUpdated from "../../triggers/contact-updated.ts";
import contactDeleted from "../../triggers/contact-deleted.ts";
import formSubmitted from "../../triggers/form-submitted.ts";

const SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const STATE = { webhookId: "5", event: "mautic.lead_post_save_new", secret: SECRET };
const DISPLAY = { baseUrl: "https://mautic.example.com" };

/** Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY. */
const BODY =
  '{ "mautic.lead_post_save_new": [ { "contact": { "id": 42,  "points": 0 },\n  "timestamp": "2026-11-09T09:30:01+00:00" } ] }';

/** Narrow the `E[] | { events, response? }` union (brief §3). */
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** Expected signature, computed independently of the app: base64(HMAC-SHA256(secret, body)). */
const sign = (body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(body).digest("base64");

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

async function ingest(raw: TriggerCall, state: unknown = STATE, trigger = newContact) {
  const { ctx } = mockCtx([], { display: DISPLAY });
  return await trigger.handleIngest!(
    { raw, params: {}, state: state as typeof STATE, subscriptionId: "sub-1" },
    ctx,
  );
}

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("handleIngest: a valid signature over the exact bytes yields the event", async () => {
  const out = evs(await ingest(call({ "webhook-signature": sign(BODY) })));
  assertEquals(out, [{
    event: "mautic.lead_post_save_new",
    timestamp: "2026-11-09T09:30:01+00:00",
    resourceId: "42",
    resource: { contact: { id: 42, points: 0 }, timestamp: "2026-11-09T09:30:01+00:00" },
  }]);
});

test("handleIngest: a one-byte change to the body throws", async () => {
  const headers = { "webhook-signature": sign(BODY) };
  await assertRejects(
    () => ingest(call(headers, BODY.replace('"points": 0', '"points": 1'))),
    Error,
    "refused",
  );
});

test("handleIngest: a flipped signature byte throws without echoing it", async () => {
  const good = sign(BODY);
  const bad = (good[0] === "A" ? "B" : "A") + good.slice(1);
  const err = await assertRejects(() => ingest(call({ "webhook-signature": bad })));
  assert(err.message.includes("refused"));
  assert(!err.message.includes(bad) && !err.message.includes(SECRET));
});

test("handleIngest: a signature made with another secret throws", async () => {
  await assertRejects(
    () => ingest(call({ "webhook-signature": sign(BODY, "another-secret") })),
    Error,
    "refused",
  );
});

test("handleIngest: a signature over the re-serialised body does not verify", async () => {
  const reserialised = JSON.stringify(JSON.parse(BODY));
  await assertRejects(
    () => ingest(call({ "webhook-signature": sign(reserialised) })),
    Error,
    "refused",
  );
});

test("handleIngest: a missing or empty signature header throws", async () => {
  await assertRejects(() => ingest(call({})), Error, "refused");
  await assertRejects(() => ingest(call({ "webhook-signature": "" })), Error, "refused");
});

test("handleIngest: an absent rawBody throws", async () => {
  await assertRejects(
    () => ingest(call({ "webhook-signature": sign(BODY) }, null)),
    Error,
    "raw body",
  );
});

test("handleIngest: an unset or empty secret refuses even with an absent or empty header", async () => {
  for (const state of [null, {}, { ...STATE, secret: "" }]) {
    for (
      const raw of [
        call({}),
        call({ "webhook-signature": "" }),
        call({ "webhook-signature": sign(BODY) }),
      ]
    ) {
      await assertRejects(() => ingest(raw, state), Error, "secret");
    }
  }
});

test("handleIngest: a non-POST delivery throws", async () => {
  await assertRejects(
    () => ingest(call({ "webhook-signature": sign(BODY) }, null, "GET")),
    Error,
    "POST",
  );
});

test("handleIngest: a verified delivery with only other event types emits nothing", async () => {
  const out = evs(await ingest(call({ "webhook-signature": sign(BODY) }), STATE, contactUpdated));
  assertEquals(out, []);
});

test("handleIngest: a queued delivery yields one event per payload of this trigger's type only", async () => {
  const body =
    '{ "mautic.lead_post_save_new": [ { "contact": { "id": 1 }, "timestamp": "t1" },  { "contact": { "id": 2 }, "timestamp": "t2" } ],\n "mautic.lead_post_save_update": [ { "contact": { "id": 3 }, "timestamp": "t3" } ] }';
  const raw = call({ "webhook-signature": sign(body) }, body);
  const out = evs(await ingest(raw)) as Array<{ resourceId: string }>;
  assertEquals(out.map((e) => e.resourceId), ["1", "2"]);
  const updates = evs(await ingest(raw, STATE, contactUpdated)) as Array<{ resourceId: string }>;
  assertEquals(updates.map((e) => e.resourceId), ["3"]);
});

test("handleIngest: delete and form-submit payloads put the id where Mautic documents it", async () => {
  const del =
    '{ "mautic.lead_post_delete": [ { "id": 42, "contact": { "id": null }, "timestamp": "t" } ] }';
  const out = evs(
    await ingest(call({ "webhook-signature": sign(del) }, del), STATE, contactDeleted),
  );
  assertEquals((out[0] as { resourceId: string }).resourceId, "42");
  const form = '{ "mautic.form_on_submit": [ { "submission": { "id": 7 }, "timestamp": "t" } ] }';
  const sub = evs(
    await ingest(call({ "webhook-signature": sign(form) }, form), STATE, formSubmitted),
  );
  assertEquals((sub[0] as { resourceId: string }).resourceId, "7");
});

test("handleIngest: a verified body that is not JSON throws a body error", async () => {
  const body = "not json {";
  const raw: TriggerCall = {
    method: "POST",
    path: "/hook",
    query: {},
    headers: { "webhook-signature": sign(body) },
    body,
    rawBody: body,
  };
  await assertRejects(() => ingest(raw), Error, "not valid JSON");
});

test("triggers: each declares output, sample and webhook hooks", () => {
  for (const t of [newContact, contactUpdated, contactDeleted, formSubmitted]) {
    assert((t.output as unknown[]).length > 0, `${t.key} output`);
    assert(t.sample !== undefined, `${t.key} sample`);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
    assertEquals(typeof t.handleIngest, "function");
    assertEquals(t.poll, undefined);
  }
});

const subscribeInput = {
  params: {},
  subscriptionId: "sub-1",
  callbackUrl: "https://w6w.example/hook/abc",
  hostUrl: "https://w6w.example",
};

test("onSubscribe: creates the webhook with a fresh secret and keeps it in state", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: { total: 0, hooks: [] } }, { status: 201, body: { hook: { id: 5 } } }],
    { display: DISPLAY },
  );
  const state = await newContact.onSubscribe!(subscribeInput, ctx);
  assertEquals(state.webhookId, "5");
  assertEquals(state.event, "mautic.lead_post_save_new");
  assert(/^[0-9a-f]{64}$/.test(state.secret), "secret is 64 hex chars");
  assertEquals(calls.length, 2);
  assertEquals(calls[0].method, "GET");
  const list = new URL(calls[0].url);
  assertEquals(list.origin + list.pathname, "https://mautic.example.com/api/hooks");
  assertEquals(list.searchParams.get("search"), "w6w sub-1");
  assertEquals(calls[1].method, "POST");
  assertEquals(calls[1].url, "https://mautic.example.com/api/hooks/new");
  assertEquals(JSON.parse(calls[1].body!), {
    name: "w6w sub-1",
    description: "Created by w6w. Deleted when the trigger is removed.",
    webhookUrl: "https://w6w.example/hook/abc",
    secret: state.secret,
    triggers: ["mautic.lead_post_save_new"],
    eventsOrderbyDir: "asc",
    isPublished: true,
  });
});

test("onSubscribe: each trigger subscribes to its own event type", async () => {
  const expected: Array<[typeof newContact, string]> = [
    [contactUpdated, "mautic.lead_post_save_update"],
    [contactDeleted, "mautic.lead_post_delete"],
    [formSubmitted, "mautic.form_on_submit"],
  ];
  for (const [t, event] of expected) {
    const { ctx, calls } = mockCtx(
      [{ body: { hooks: [] } }, { status: 201, body: { hook: { id: 9 } } }],
      { display: DISPLAY },
    );
    await t.onSubscribe!(subscribeInput, ctx);
    assertEquals(JSON.parse(calls[1].body!).triggers, [event]);
  }
});

test("onSubscribe: deletes a leftover webhook (id-keyed list) that already points at the callback URL", async () => {
  const { ctx, calls } = mockCtx(
    [
      {
        body: {
          total: 2,
          hooks: {
            "3": { id: 3, webhookUrl: "https://w6w.example/hook/abc" },
            "4": { id: 4, webhookUrl: "https://elsewhere.example/h" },
          },
        },
      },
      { body: { hook: { id: 3 } } },
      { status: 201, body: { hook: { id: 6 } } },
    ],
    { display: DISPLAY },
  );
  await newContact.onSubscribe!(subscribeInput, ctx);
  assertEquals(calls[1].method, "DELETE");
  assertEquals(calls[1].url, "https://mautic.example.com/api/hooks/3/delete");
  assertEquals(calls.filter((c) => c.method === "DELETE").length, 1);
});

test("onSubscribe: a response without an id is an error", async () => {
  const { ctx } = mockCtx(
    [{ body: { hooks: [] } }, { status: 201, body: { hook: {} } }],
    { display: DISPLAY },
  );
  await assertRejects(() => newContact.onSubscribe!(subscribeInput, ctx), Error, "no id");
});

test("onUnsubscribe: deletes the webhook; 404 and 410 count as already gone", async () => {
  for (const status of [200, 404, 410]) {
    const { ctx, calls } = mockCtx(
      [{
        status,
        body: status === 200 ? { hook: { id: 5 } } : { error: { message: "gone", code: status } },
      }],
      { display: DISPLAY },
    );
    await newContact.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, ctx);
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, "DELETE");
    assertEquals(calls[0].url, "https://mautic.example.com/api/hooks/5/delete");
  }
});

test("onUnsubscribe: any other failure propagates; no state means no call", async () => {
  const failing = mockCtx([{ status: 500, body: "boom" }], { display: DISPLAY });
  await assertRejects(
    () => newContact.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, failing.ctx),
    Error,
    "500",
  );
  const idle = mockCtx([], { display: DISPLAY });
  await newContact.onUnsubscribe!(
    { params: {}, state: undefined as unknown as typeof STATE, subscriptionId: "s" },
    idle.ctx,
  );
  assertEquals(idle.calls.length, 0);
});
