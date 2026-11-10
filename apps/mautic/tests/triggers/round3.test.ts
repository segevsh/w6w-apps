import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import companySaved from "../../triggers/company-saved.ts";
import companyDeleted from "../../triggers/company-deleted.ts";
import pointsChanged from "../../triggers/contact-points-changed.ts";
import channelChanged from "../../triggers/contact-channel-subscription-changed.ts";
import contactCompanyChanged from "../../triggers/contact-company-changed.ts";
import emailSent from "../../triggers/email-sent.ts";
import emailOpened from "../../triggers/email-opened.ts";
import smsSent from "../../triggers/sms-sent.ts";
import pageHit from "../../triggers/page-hit.ts";
import anyEvent from "../../triggers/any-event.ts";
import newCampaign from "../../triggers/new-campaign.ts";
import newSegment from "../../triggers/new-segment.ts";
import newEmail from "../../triggers/new-email.ts";
import newTag from "../../triggers/new-tag.ts";
import { CATALOG_EVENTS, resolveEventTypes } from "../../lib/triggers.ts";

const SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const DISPLAY = { baseUrl: "https://mautic.example.com" };
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Independent of app code: base64(HMAC-SHA256(secret, raw body)) in `Webhook-Signature`
// (https://devdocs.mautic.org/en/7.1/webhooks/getting_started.html, 2026-11-10).
const sign = (body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(body).digest("base64");
// Replace the last base64 character (before the padding) with a different one.
const flip = (sig: string) => {
  const i = sig.search(/[A-Za-z0-9+/]=*$/);
  return sig.slice(0, i) + (sig[i] === "A" ? "B" : "A") + sig.slice(i + 1);
};

const TS = "2026-11-10T09:30:01+00:00";
// One row per named webhook trigger. Bodies carry non-canonical whitespace.
const cases = [
  {
    t: companySaved,
    type: "mautic.company_post_save",
    body:
      `{ "mautic.company_post_save": [ { "company": { "id": 5,  "fields": {} },\n "timestamp": "${TS}" } ] }`,
    id: "5",
  },
  {
    t: companyDeleted,
    type: "mautic.company_post_delete",
    body:
      `{ "mautic.company_post_delete": [ { "id": 5,  "company": { "id": null },\n "timestamp": "${TS}" } ] }`,
    id: "5",
  },
  {
    t: pointsChanged,
    type: "mautic.lead_points_change",
    body:
      `{ "mautic.lead_points_change": [ { "contact": { "id": 42 },  "points": {"old_points":0,"new_points":10},\n "timestamp": "${TS}" } ] }`,
    id: "42",
  },
  {
    t: channelChanged,
    type: "mautic.lead_channel_subscription_changed",
    body:
      `{ "mautic.lead_channel_subscription_changed": [ { "contact": { "id": 42 },  "channel": "email",\n "old_status":"contactable","new_status":"unsubscribed", "timestamp": "${TS}" } ] }`,
    id: "42",
  },
  {
    t: contactCompanyChanged,
    type: "mautic.lead_company_change",
    body:
      `{ "mautic.lead_company_change": [ { "added": true,  "contact": { "id": 42 }, "company": {"id": 5},\n "timestamp": "${TS}" } ] }`,
    id: "42",
  },
  {
    t: emailSent,
    type: "mautic.email_on_send",
    body:
      `{ "mautic.email_on_send": [ { "email": {"id": 9}, "contact": { "id": 42 },  "subject": "Hi",\n "timestamp": "${TS}" } ] }`,
    id: "42",
  },
  {
    t: emailOpened,
    type: "mautic.email_on_open",
    body:
      `{ "mautic.email_on_open": [ { "email": {"id": 9}, "contact": { "id": 43 },  "subject": "Hi",\n "timestamp": "${TS}" } ] }`,
    id: "43",
  },
  {
    t: smsSent,
    type: "mautic.sms_on_send",
    body:
      `{ "mautic.sms_on_send": [ { "smsId": 3, "contact": { "id": 42 },  "content": "Hi",\n "timestamp": "${TS}" } ] }`,
    id: "42",
  },
  {
    t: pageHit,
    type: "mautic.page_on_hit",
    body:
      `{ "mautic.page_on_hit": [ { "hit": { "id": 88,  "page": {"id": 2} },\n "timestamp": "${TS}" } ] }`,
    id: "88",
  },
];

const ingest = (t: { handleIngest?: unknown }, over: {
  body: string;
  headers?: Record<string, string>;
  rawBody?: string | undefined;
  secret?: unknown;
  params?: Record<string, unknown>;
}) =>
  // deno-lint-ignore no-explicit-any
  (t as any).handleIngest({
    raw: {
      method: "POST",
      path: "/hook",
      query: {},
      headers: over.headers ?? { "webhook-signature": sign(over.body) },
      body: null,
      ...("rawBody" in over ? { rawBody: over.rawBody } : { rawBody: over.body }),
    },
    params: over.params ?? {},
    state: { webhookId: "5", event: "x", secret: "secret" in over ? over.secret : SECRET },
    subscriptionId: "sub-1",
  }, mockCtx([], { display: DISPLAY }).ctx);

for (const { t, type, body, id } of cases) {
  test(`mautic ${t.key}: signed ${type} → one event; flipped signature byte, changed body byte, missing header/rawBody, unset secret → refused`, async () => {
    assert(JSON.stringify(JSON.parse(body)) !== body);
    const out = evs(await ingest(t, { body })) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals([out[0].event, out[0].resourceId, out[0].timestamp], [type, id, TS]);

    await assertRejects(() =>
      ingest(t, { body, headers: { "webhook-signature": flip(sign(body)) } })
    );
    await assertRejects(() => ingest(t, { body, rawBody: body.replace("timestamp", "timestamq") }));
    await assertRejects(() =>
      ingest(t, { body, headers: { "webhook-signature": sign(body, "other-secret") } })
    );
    await assertRejects(() => ingest(t, { body, headers: {} }));
    await assertRejects(() => ingest(t, { body, rawBody: undefined }));
    for (const secret of [undefined, ""]) {
      await assertRejects(() => ingest(t, { body, secret, headers: {} }));
      await assertRejects(() => ingest(t, { body, secret, headers: { "webhook-signature": "" } }));
    }
    // a verified delivery for another event type yields no event
    const other = `{ "mautic.something_else": [ { "id": 1 } ] }`;
    assertEquals(evs(await ingest(t, { body: other })), []);
  });
}

test("mautic: each new webhook trigger subscribes to exactly its own event type", async () => {
  for (const { t, type } of cases) {
    const { ctx, calls } = mockCtx(
      [{ body: { hooks: [] } }, { status: 201, body: { hook: { id: 9 } } }],
      { display: DISPLAY },
    );
    const state = await t.onSubscribe!({
      params: {},
      subscriptionId: "sub-1",
      callbackUrl: "https://w6w.example/hook/abc",
      hostUrl: "https://w6w.example",
    }, ctx);
    assertEquals([state.webhookId, state.event], ["9", type]);
    assertEquals([calls[1].method, calls[1].url], [
      "POST",
      "https://mautic.example.com/api/hooks/new",
    ]);
    assertEquals(JSON.parse(calls[1].body!).triggers, [type]);
  }
});

test("mautic: every new trigger declares output and a sample", () => {
  for (const t of [...cases.map((c) => c.t), anyEvent, newCampaign, newSegment, newEmail, newTag]) {
    assert((t.output as unknown[]).length > 0, `${t.key} output`);
    assert(t.sample !== undefined, `${t.key} sample`);
  }
});

// ---- Any event ----------------------------------------------------------------------------------

const MULTI = `{ "mautic.form_on_submit": [ { "submission": { "id": 7 },  "timestamp": "${TS}" } ],
  "mautic.page_on_hit": [ { "hit": { "id": 88 }, "timestamp": "${TS}" }, { "hit": { "id": 89 }, "timestamp": "${TS}" } ],
  "mautic.lead_post_delete": [ { "id": 3, "timestamp": "${TS}" } ] }`;

test("mautic any-event: one verified delivery yields one event per payload of the chosen types", async () => {
  assert(JSON.stringify(JSON.parse(MULTI)) !== MULTI);
  const all = evs(await ingest(anyEvent, { body: MULTI })) as Array<Record<string, unknown>>;
  assertEquals(all.map((e) => [e.event, e.resourceId]), [
    ["mautic.form_on_submit", "7"],
    ["mautic.page_on_hit", "88"],
    ["mautic.page_on_hit", "89"],
    ["mautic.lead_post_delete", "3"],
  ]);
  const some = evs(
    await ingest(anyEvent, {
      body: MULTI,
      params: { events: "mautic.page_on_hit, mautic.lead_post_delete" },
    }),
  ) as Array<Record<string, unknown>>;
  assertEquals(some.map((e) => e.resourceId), ["88", "89", "3"]);
  assertEquals(
    evs(await ingest(anyEvent, { body: MULTI, params: { events: "mautic.email_on_open" } })),
    [],
  );
});

test("mautic any-event: flipped signature byte, missing header/rawBody, unset secret → refused", async () => {
  await assertRejects(() =>
    ingest(anyEvent, { body: MULTI, headers: { "webhook-signature": flip(sign(MULTI)) } })
  );
  await assertRejects(() => ingest(anyEvent, { body: MULTI, headers: {} }));
  await assertRejects(() => ingest(anyEvent, { body: MULTI, rawBody: undefined }));
  for (const secret of [undefined, ""]) {
    await assertRejects(() => ingest(anyEvent, { body: MULTI, secret, headers: {} }));
  }
});

test("mautic any-event: resolveEventTypes — empty = the whole catalog; names are validated", () => {
  assertEquals(resolveEventTypes(""), [...CATALOG_EVENTS]);
  assertEquals(CATALOG_EVENTS.length, 13);
  assertEquals(
    resolveEventTypes(" mautic.page_on_hit , mautic.page_on_hit,mautic.form_on_submit"),
    [
      "mautic.page_on_hit",
      "mautic.form_on_submit",
    ],
  );
  for (const bad of ["page_on_hit", "mautic.", "x;drop"]) {
    let threw = false;
    try {
      resolveEventTypes(bad);
    } catch {
      threw = true;
    }
    assert(threw, bad);
  }
});

test("mautic any-event: onSubscribe registers ONE webhook with the chosen (or all) event types; unsubscribe deletes it", async () => {
  const input = {
    params: { events: "mautic.form_on_submit,mautic.page_on_hit" },
    subscriptionId: "sub-1",
    callbackUrl: "https://w6w.example/hook/abc",
    hostUrl: "https://w6w.example",
  };
  const m = mockCtx([{ body: { hooks: [] } }, { status: 201, body: { hook: { id: 11 } } }], {
    display: DISPLAY,
  });
  const state = await anyEvent.onSubscribe!(input, m.ctx);
  assertEquals([state.webhookId, state.events], ["11", [
    "mautic.form_on_submit",
    "mautic.page_on_hit",
  ]]);
  assert(/^[0-9a-f]{64}$/.test(state.secret));
  assertEquals(JSON.parse(m.calls[1].body!), {
    name: "w6w sub-1",
    description: "Created by w6w. Deleted when the trigger is removed.",
    webhookUrl: "https://w6w.example/hook/abc",
    secret: state.secret,
    triggers: ["mautic.form_on_submit", "mautic.page_on_hit"],
    eventsOrderbyDir: "asc",
    isPublished: true,
  });

  const all = mockCtx([{ body: { hooks: [] } }, { status: 201, body: { hook: { id: 12 } } }], {
    display: DISPLAY,
  });
  await anyEvent.onSubscribe!({ ...input, params: {} }, all.ctx);
  assertEquals(JSON.parse(all.calls[1].body!).triggers, [...CATALOG_EVENTS]);

  const bad = mockCtx([], { display: DISPLAY });
  await assertRejects(() =>
    anyEvent.onSubscribe!({ ...input, params: { events: "nope" } }, bad.ctx)
  );
  assertEquals(bad.calls.length, 0);

  const u = mockCtx([{ body: { hook: { id: 11 } } }], { display: DISPLAY });
  await anyEvent.onUnsubscribe!({ params: {}, state, subscriptionId: "sub-1" }, u.ctx);
  assertEquals([u.calls[0].method, u.calls[0].url], [
    "DELETE",
    "https://mautic.example.com/api/hooks/11/delete",
  ]);
});

// ---- Snapshot polls -------------------------------------------------------------------------------

for (
  const { name, trigger, path, key, old, fresh } of [
    {
      name: "new-campaign",
      trigger: newCampaign,
      path: "/api/campaigns",
      key: "campaigns",
      old: { "1": { id: 1, name: "One" } },
      fresh: { id: 2, name: "Two" },
    },
    {
      name: "new-segment",
      trigger: newSegment,
      path: "/api/segments",
      key: "lists",
      old: { "1": { id: 1, name: "One" } },
      fresh: { id: 2, name: "Two" },
    },
    {
      name: "new-email",
      trigger: newEmail,
      path: "/api/emails",
      key: "emails",
      old: { "1": { id: 1, name: "One" } },
      fresh: { id: 2, name: "Two" },
    },
    {
      name: "new-tag",
      trigger: newTag,
      path: "/api/tags",
      key: "tags",
      old: [{ id: 1, tag: "one" }],
      fresh: { id: 2, tag: "two" },
    },
  ]
) {
  const input = (state: unknown) => ({ params: {}, state, subscriptionId: "sub-1" });
  const oldRows = Array.isArray(old) ? old : Object.values(old);
  const withFresh = Array.isArray(old) ? [fresh, ...old] : { ...old, "2": fresh };
  test(`mautic ${name}: seeds silently, emits only the new record, idempotent, literal request`, async () => {
    const m = mockCtx([{ body: { total: 1, [key]: old } }], { display: DISPLAY });
    const seeded = await trigger.poll!(input({}) as never, m.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    assertEquals(m.calls.length, 1);
    const u = new URL(m.calls[0].url);
    assertEquals([m.calls[0].method, u.origin + u.pathname, Object.fromEntries(u.searchParams)], [
      "GET",
      "https://mautic.example.com" + path,
      { start: "0", limit: "100" },
    ]);
    assertEquals(oldRows.length, 1);

    const run = () => mockCtx([{ body: { total: 2, [key]: withFresh } }], { display: DISPLAY });
    const a = await trigger.poll!(input(seeded.nextState) as never, run().ctx);
    assertEquals(a.events, [fresh]);
    assertEquals(await trigger.poll!(input(seeded.nextState) as never, run().ctx), a);
    assertEquals((await trigger.poll!(input(a.nextState) as never, run().ctx)).events, []);
  });
}
