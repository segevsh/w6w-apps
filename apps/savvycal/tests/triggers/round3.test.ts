import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";
import requested from "../../triggers/event-requested.ts";
import approved from "../../triggers/event-approved.ts";
import declined from "../../triggers/event-declined.ts";
import changed from "../../triggers/event-changed.ts";
import checkoutCompleted from "../../triggers/event-checkout-completed.ts";
import attendeeAdded from "../../triggers/event-attendee-added.ts";
import attendeeCanceled from "../../triggers/event-attendee-canceled.ts";
import pollCreated from "../../triggers/poll-response-created.ts";
import pollUpdated from "../../triggers/poll-response-updated.ts";
import anyEvent from "../../triggers/any-event.ts";
import newLink from "../../triggers/new-link.ts";
import newWorkflow from "../../triggers/new-workflow.ts";
import newWorkflowRule from "../../triggers/new-workflow-rule.ts";
import { wantedTypes } from "../../lib/triggers.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-webhook-secret-0123456789";

// Independent of app code: node:crypto, uppercase hex after `sha256=` as the vendor's own example
// (https://docs.savvycal.com/developers/webhooks, 2026-11-10).
const sig = (body: string, secret = SECRET) =>
  `sha256=${createHmac("sha256", secret).update(body).digest("hex").toUpperCase()}`;
const flip = (s: string) => s.slice(0, -1) + (s.endsWith("0") ? "1" : "0");

const flat = (type: string) =>
  `{ "type" : "${type}",  "id":"payload_P1", "occurred_at":"2026-11-10T10:30:00Z",
  "version":"2020-11-18",
  "payload": { "id":"event_E1", "summary":"30 Minute Meeting", "state":"confirmed",
  "start_at":"2026-11-20T14:00:00Z", "duration":30, "link": {"id":"link_L1","name":"30 Minute"},
  "organizer": {"display_name":"Grace","email":"grace@example.com"}, "attendees":[] } }`;
const nested = (type: string, extra: string) =>
  `{ "type" : "${type}",  "id":"payload_P2", "occurred_at":"2026-11-10T10:30:00Z",
  "payload": { "event": { "id":"event_E2", "summary":"Group", "state":"confirmed", "duration":45,
  "link": {"id":"link_L2","name":"Group call"}, "organizer": {"display_name":"Grace","email":"g@example.com"} },
  ${extra} } }`;
const poll = (type: string) =>
  `{ "type" : "${type}",  "id":"payload_P3", "occurred_at":"2026-11-10T10:30:00Z",
  "payload": { "id":"pr_1", "display_name":"Ada", "email":"ada@example.com", "poll": {"id":"poll_1"} } }`;

const cases = [
  { t: requested, type: "event.requested", body: flat("event.requested"), eventId: "event_E1" },
  { t: approved, type: "event.approved", body: flat("event.approved"), eventId: "event_E1" },
  { t: declined, type: "event.declined", body: flat("event.declined"), eventId: "event_E1" },
  {
    t: checkoutCompleted,
    type: "event.checkout.completed",
    body: flat("event.checkout.completed"),
    eventId: "event_E1",
  },
  {
    t: changed,
    type: "event.changed",
    body: nested("event.changed", `"previous_attributes": {"duration": 30}`),
    eventId: "event_E2",
  },
  {
    t: attendeeAdded,
    type: "event.attendee.added",
    body: nested("event.attendee.added", `"attendee": {"email":"new@example.com"}`),
    eventId: "event_E2",
  },
  {
    t: attendeeCanceled,
    type: "event.attendee.canceled",
    body: nested("event.attendee.canceled", `"attendee": {"email":"gone@example.com"}`),
    eventId: "event_E2",
  },
  {
    t: pollCreated,
    type: "poll.response.created",
    body: poll("poll.response.created"),
    eventId: null,
  },
  {
    t: pollUpdated,
    type: "poll.response.updated",
    body: poll("poll.response.updated"),
    eventId: null,
  },
];

const ingest = (
  t: { handleIngest?: unknown },
  over: {
    body: string;
    signature?: string;
    headers?: Record<string, string>;
    rawBody?: string | undefined;
    secret?: unknown;
    params?: Record<string, unknown>;
  },
) =>
  // deno-lint-ignore no-explicit-any
  (t as any).handleIngest({
    raw: {
      method: "POST",
      path: "/",
      query: {},
      headers: over.headers ?? { "x-savvycal-signature": over.signature ?? sig(over.body) },
      body: null,
      ...("rawBody" in over ? { rawBody: over.rawBody } : { rawBody: over.body }),
    },
    params: over.params ?? {},
    state: { webhookId: "wh_1", secret: "secret" in over ? over.secret : SECRET },
    subscriptionId: "sub_1",
  }, mockCtx().ctx);

for (const { t, type, body, eventId } of cases) {
  test(`savvycal ${t.key}: signed ${type} → one event; flipped signature byte, flipped body byte, missing header/rawBody, unset secret → refused`, async () => {
    assert(JSON.stringify(JSON.parse(body)) !== body);
    const out = evs(await ingest(t, { body })) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].type, type);
    assertEquals(out[0].eventId, eventId);
    assertEquals(out[0].deliveryId !== null, true);

    await assertRejects(() => ingest(t, { body, signature: flip(sig(body)) }));
    await assertRejects(() => ingest(t, { body, rawBody: body.replace('"type"', '"typé"') }));
    await assertRejects(() => ingest(t, { body, signature: sig(body, "another-secret") }));
    await assertRejects(() => ingest(t, { body, headers: {} }));
    await assertRejects(() => ingest(t, { body, headers: { "x-savvycal-signature": "" } }));
    await assertRejects(() => ingest(t, { body, rawBody: undefined }));
    for (const secret of [undefined, "", null]) {
      await assertRejects(() => ingest(t, { body, secret, headers: {} }));
      await assertRejects(() =>
        ingest(t, { body, secret, headers: { "x-savvycal-signature": "" } })
      );
    }
    // a verified delivery of another type is acknowledged with no event
    const other = flat("event.created");
    assertEquals(evs(await ingest(t, { body: other })), []);
  });
}

test("savvycal: event.changed / attendee deliveries expose the nested event and keep the whole payload", async () => {
  const c = cases.find((x) => x.t === changed)!;
  const [ev] = evs(await ingest(changed, { body: c.body })) as Array<Record<string, unknown>>;
  assertEquals([ev.summary, ev.duration, ev.linkId, ev.organizerEmail], [
    "Group",
    45,
    "link_L2",
    "g@example.com",
  ]);
  assertEquals((ev.data as Record<string, unknown>).previous_attributes, { duration: 30 });
  const a = cases.find((x) => x.t === attendeeAdded)!;
  const [ev2] = evs(await ingest(attendeeAdded, { body: a.body })) as Array<
    Record<string, unknown>
  >;
  assertEquals((ev2.data as { attendee: unknown }).attendee, { email: "new@example.com" });
});

test("savvycal poll.response: no event id is invented from the response id", async () => {
  const [ev] = evs(await ingest(pollCreated, { body: poll("poll.response.created") })) as Array<
    Record<string, unknown>
  >;
  assertEquals([ev.eventId, ev.summary], [null, null]);
  assertEquals((ev.data as { id: string }).id, "pr_1");
});

test("savvycal: new webhook triggers register and delete through the API like the originals", async () => {
  const m = mockCtx([{ body: { id: "wh_9", secret: "s3", url: "https://cb.example.test" } }]);
  const state = await changed.onSubscribe!(
    {
      params: {},
      callbackUrl: "https://cb.example.test",
      subscriptionId: "sub",
      hostUrl: "https://h",
    },
    m.ctx,
  );
  assertEquals(state, { webhookId: "wh_9", secret: "s3" });
  assertEquals([m.calls[0].method, pathOf(m.calls[0].url), JSON.parse(m.calls[0].body!)], [
    "POST",
    "/v1/webhooks",
    { url: "https://cb.example.test" },
  ]);
  const u = mockCtx([{ status: 204 }]);
  await changed.onUnsubscribe!({ params: {}, state, subscriptionId: "sub" }, u.ctx);
  assertEquals([u.calls[0].method, pathOf(u.calls[0].url)], ["DELETE", "/v1/webhooks/wh_9"]);
});

// ---- Any event ----------------------------------------------------------------------------------

test("savvycal any-event: empty events keeps every type; a list keeps only those", async () => {
  const body = nested("event.attendee.rescheduled", `"attendee": {"email":"a@example.com"}`);
  assertEquals(evs(await ingest(anyEvent, { body, params: {} })).length, 1);
  assertEquals(evs(await ingest(anyEvent, { body, params: { events: "" } })).length, 1);
  assertEquals(
    evs(
      await ingest(anyEvent, {
        body,
        params: { events: "event.created, event.attendee.rescheduled" },
      }),
    )
      .length,
    1,
  );
  assertEquals(
    evs(await ingest(anyEvent, { body, params: { events: "event.created,event.canceled" } })),
    [],
  );
});

test("savvycal any-event: unknown type in events throws; signature checks still apply", async () => {
  const body = flat("event.created");
  await assertRejects(() => ingest(anyEvent, { body, params: { events: "event.nope" } }));
  assertEquals(wantedTypes(""), null);
  assertEquals([...wantedTypes("poll.response.created , event.changed")!], [
    "poll.response.created",
    "event.changed",
  ]);
  await assertRejects(() => ingest(anyEvent, { body, signature: flip(sig(body)) }));
  await assertRejects(() => ingest(anyEvent, { body, headers: {} }));
  await assertRejects(() => ingest(anyEvent, { body, rawBody: undefined }));
  await assertRejects(() => ingest(anyEvent, { body, secret: "", headers: {} }));
  assertEquals(anyEvent.params!.map((p) => p.key), ["events"]);
});

// ---- Snapshot polls -------------------------------------------------------------------------------

const input = (params: Record<string, unknown>, state: unknown) => ({
  params,
  state,
  subscriptionId: "sub-1",
});

for (
  const { name, trigger, params, path, old, fresh } of [
    {
      name: "new-link",
      trigger: newLink,
      params: {},
      path: "/v1/links",
      old: [{ id: "link_1", name: "One" }],
      fresh: { id: "link_2", name: "Two" },
    },
    {
      name: "new-workflow",
      trigger: newWorkflow,
      params: {},
      path: "/v1/workflows",
      old: [{ id: "wkflw_1", name: "One" }],
      fresh: { id: "wkflw_2", name: "Two" },
    },
  ]
) {
  test(`savvycal ${name}: seeds silently, emits only the new record, idempotent, literal request, follows the cursor`, async () => {
    const m = mockCtx([{ body: page(old) }]);
    const seeded = await trigger.poll!(input(params, {}) as never, m.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    assertEquals([m.calls[0].method, pathOf(m.calls[0].url), queryOf(m.calls[0].url)], [
      "GET",
      path,
      { limit: "100" },
    ]);

    // two pages: the new record sits on page 2, reached through metadata.after
    const run = () => mockCtx([{ body: page(old, "cur_2") }, { body: page([fresh]) }]);
    const m2 = run();
    const a = await trigger.poll!(input(params, seeded.nextState) as never, m2.ctx);
    assertEquals(a.events, [fresh]);
    assertEquals(queryOf(m2.calls[1].url), { limit: "100", after: "cur_2" });
    const b = await trigger.poll!(input(params, seeded.nextState) as never, run().ctx);
    assertEquals(b, a);
    const again = await trigger.poll!(input(params, a.nextState) as never, run().ctx);
    assertEquals(again.events, []);
  });
}

test("savvycal new-workflow-rule: per-workflow snapshot — literal request, seed, new rule, requires workflowId", async () => {
  const params = { workflowId: "wkflw_1" };
  const old = [{ id: "wrule_1", trigger_type: "event_created" }];
  const fresh = { id: "wrule_2", trigger_type: "event_canceled" };
  const m = mockCtx([{ body: old }]);
  const seeded = await newWorkflowRule.poll!(input(params, {}) as never, m.ctx);
  assertEquals(seeded.events, []);
  assertEquals([m.calls[0].method, pathOf(m.calls[0].url), queryOf(m.calls[0].url)], [
    "GET",
    "/v1/workflows/wkflw_1/rules",
    {},
  ]);
  const run = () => mockCtx([{ body: [fresh, ...old] }]);
  const a = await newWorkflowRule.poll!(input(params, seeded.nextState) as never, run().ctx);
  assertEquals(a.events, [fresh]);
  assertEquals(await newWorkflowRule.poll!(input(params, seeded.nextState) as never, run().ctx), a);
  assertEquals(
    (await newWorkflowRule.poll!(input(params, a.nextState) as never, run().ctx)).events,
    [],
  );
  await assertRejects(() => newWorkflowRule.poll!(input({}, {}) as never, mockCtx().ctx));
  assertEquals(newWorkflowRule.params![0].required, true);
});

test("savvycal: a list record without an id is a loud failure, not a silent skip", async () => {
  await assertRejects(() =>
    newLink.poll!(input({}, {}) as never, mockCtx([{ body: page([{ name: "no id" }]) }]).ctx)
  );
});
