import assert from "node:assert/strict";
import test from "node:test";
import contactUpdated from "../../triggers/contact-updated.ts";
import contactDeleted from "../../triggers/contact-deleted.ts";
import emailDelivered from "../../triggers/email-delivered.ts";
import emailOpened from "../../triggers/email-opened.ts";
import emailClicked from "../../triggers/email-clicked.ts";
import emailBounced from "../../triggers/email-bounced.ts";
import emailUnsubscribed from "../../triggers/email-unsubscribed.ts";
import inboundEmail from "../../triggers/inbound-email.ts";
import anyEvent from "../../triggers/any-event.ts";
import contactCreated from "../../triggers/contact-created.ts";
import newSender from "../../triggers/new-sender.ts";
import { mockCtx } from "../_helpers.ts";

const CALLBACK = "https://w6w.example/triggers/webhooks/sub_9";
const SECRET = "test-secret-0123456789abcdef";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const RAW =
  `{ "id" : 7,\n "email":"ada@example.com" , "event" : "delivered",\n "key": "internal-key" }`;
assert.notEqual(JSON.stringify(JSON.parse(RAW)), RAW);
const state = { webhookId: "9", secret: SECRET };
const bearer = (s: string) => ({ authorization: `Bearer ${s}` });

// deno-lint-ignore no-explicit-any
const ingest = async (t: any, st: unknown, over: Record<string, unknown> = {}) =>
  await t.handleIngest!({
    raw: {
      method: "POST",
      path: "",
      query: {},
      headers: bearer(SECRET),
      body: null,
      rawBody: RAW,
      ...over,
    },
    params: {},
    state: st,
    subscriptionId: "sub",
  }, mockCtx().ctx);

/** Flip one character at the start, the middle and the end of the secret. */
const flips = () =>
  [0, Math.floor(SECRET.length / 2), SECRET.length - 1].map((i) =>
    SECRET.slice(0, i) + (SECRET[i] === "a" ? "b" : "a") + SECRET.slice(i + 1)
  );

const CASES = [
  [contactUpdated, "marketing", ["contactUpdated"]],
  [contactDeleted, "marketing", ["contactDeleted"]],
  [emailDelivered, "transactional", ["delivered"]],
  [emailOpened, "transactional", ["opened"]],
  [emailClicked, "transactional", ["click"]],
  [emailBounced, "transactional", ["hardBounce", "softBounce"]],
  [emailUnsubscribed, "transactional", ["unsubscribed"]],
] as const;

for (const [t, type, events] of CASES) {
  test(`brevo ${t.key}: registers ${type}/${events.join("+")} with a bearer token and verifies it`, async () => {
    const { ctx, calls } = mockCtx([{ body: { webhooks: [] } }, { body: { id: 9 } }]);
    const got = await t.onSubscribe!({ params: {}, callbackUrl: CALLBACK }, ctx) as typeof state;
    assert.equal(got.webhookId, "9");
    assert.equal(got.secret.length >= 32, true);
    assert.deepEqual(calls.map((c) => [c.method, c.url]), [
      ["GET", "https://api.brevo.com/v3/webhooks"],
      ["POST", "https://api.brevo.com/v3/webhooks"],
    ]);
    assert.deepEqual(JSON.parse(calls[1].body!), {
      url: CALLBACK,
      description: `w6w ${t.title}`,
      events,
      type,
      auth: { type: "bearer", token: got.secret },
    });

    // valid delivery -> one event, the vendor's internal key is stripped
    assert.deepEqual(evs(await ingest(t, state)), [{
      id: 7,
      email: "ada@example.com",
      event: "delivered",
    }]);
    for (const bad of flips()) {
      await assert.rejects(() => ingest(t, state, { headers: bearer(bad) }), (e: Error) => {
        assert.equal(e.message.includes(bad) || e.message.includes(SECRET), false);
        return true;
      });
    }
    await assert.rejects(
      () => ingest(t, state, { headers: {} }),
      /Authorization header is missing/,
    );
    await assert.rejects(() => ingest(t, state, { headers: { authorization: SECRET } }));
    await assert.rejects(() => ingest(t, state, { rawBody: undefined }), /raw body/);
    for (const s of [undefined, {}, { webhookId: "9", secret: "" }]) {
      await assert.rejects(
        () => ingest(t, s, { headers: { authorization: "Bearer " } }),
        /secret/,
      );
    }
    await assert.rejects(() => ingest(t, state, { rawBody: "nope" }), /not JSON/);
    await assert.rejects(() => ingest(t, state, { rawBody: "[1]" }));
    assert.equal(t.output.length > 0 && t.sample !== undefined, true);
  });
}

test("brevo inbound-email: needs a domain, registers it, and emits one event per parsed item", async () => {
  await assert.rejects(
    () => inboundEmail.onSubscribe!({ params: {}, callbackUrl: CALLBACK }, mockCtx([]).ctx),
    /Domain/,
  );
  const { ctx, calls } = mockCtx([{ body: [] }, { body: { id: 11 } }]);
  const got = await inboundEmail.onSubscribe!(
    { params: { domain: "inbound.example.com" }, callbackUrl: CALLBACK },
    ctx,
  ) as typeof state;
  assert.deepEqual(JSON.parse(calls[1].body!), {
    url: CALLBACK,
    description: "w6w Inbound Email",
    events: ["inboundEmailProcessed"],
    type: "inbound",
    domain: "inbound.example.com",
    auth: { type: "bearer", token: got.secret },
  });
  const raw = `{ "items" : [ {"MessageId":"<a@x>", "Subject":"Hi"} , {"MessageId":"<b@x>"} ] }`;
  assert.deepEqual(evs(await ingest(inboundEmail, state, { rawBody: raw })), [
    { MessageId: "<a@x>", Subject: "Hi" },
    { MessageId: "<b@x>" },
  ]);
  for (const bad of flips()) {
    await assert.rejects(() => ingest(inboundEmail, state, { rawBody: raw, headers: bearer(bad) }));
  }
});

test("brevo any-event: registers the named events of the chosen type, or all of that type", async () => {
  const a = mockCtx([{ body: [] }, { body: { id: 5 } }]);
  await anyEvent.onSubscribe!(
    { params: { type: "marketing", events: " spam, listAddition ,spam" }, callbackUrl: CALLBACK },
    a.ctx,
  );
  const body = JSON.parse(a.calls[1].body!);
  assert.deepEqual([body.type, body.events], ["marketing", ["spam", "listAddition"]]);

  const b = mockCtx([{ body: [] }, { body: { id: 6 } }]);
  await anyEvent.onSubscribe!({ params: {}, callbackUrl: CALLBACK }, b.ctx);
  const all = JSON.parse(b.calls[1].body!);
  assert.equal(all.type, "transactional");
  assert.deepEqual(all.events, [
    "sent",
    "request",
    "delivered",
    "hardBounce",
    "softBounce",
    "blocked",
    "spam",
    "invalid",
    "deferred",
    "click",
    "opened",
    "uniqueOpened",
    "unsubscribed",
  ]);

  // an event of the wrong type, or an unknown type, is refused before any call
  for (
    const params of [{ type: "marketing", events: "delivered,sent" }, { type: "sms" }, {
      type: "inbound",
    }]
  ) {
    const m = mockCtx([]);
    await assert.rejects(() => anyEvent.onSubscribe!({ params, callbackUrl: CALLBACK }, m.ctx));
    assert.equal(m.calls.length, 0);
  }
  assert.deepEqual(evs(await ingest(anyEvent, state)), [
    { id: 7, email: "ada@example.com", event: "delivered" },
  ]);
  for (const bad of flips()) {
    await assert.rejects(() => ingest(anyEvent, state, { headers: bearer(bad) }));
  }
  await assert.rejects(() => ingest(anyEvent, state, { headers: {} }));
  await assert.rejects(() => ingest(anyEvent, state, { rawBody: undefined }), /raw body/);
  await assert.rejects(() => ingest(anyEvent, undefined, { headers: {} }), /secret/);
});

test("brevo webhooks: onUnsubscribe deletes the webhook and treats 404 as gone", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await emailDelivered.onUnsubscribe!({ params: {}, state }, ctx);
  assert.deepEqual(calls.map((c) => [c.method, c.url]), [[
    "DELETE",
    "https://api.brevo.com/v3/webhooks/9",
  ]]);
  await emailDelivered.onUnsubscribe!(
    { params: {}, state },
    mockCtx([{ status: 404, statusText: "Not Found", body: {} }]).ctx,
  );
});

const contact = (id: number) => ({ id, email: `c${id}@example.com`, listIds: [1] });
const input = { params: {}, subscriptionId: "sub" };

test("brevo contact-created: seeds, emits only new contacts, is idempotent, asks newest first", async () => {
  const seed = mockCtx([{ body: { contacts: [contact(2), contact(1)], count: 2 } }]);
  const seeded = await contactCreated.poll!({ ...input, state: {} }, seed.ctx);
  assert.deepEqual(seeded.events, []);
  assert.equal((seeded.nextState as { seeded?: boolean }).seeded, true);
  assert.equal(seed.calls[0].method, "GET");
  assert.equal(seed.calls[0].url, "https://api.brevo.com/v3/contacts?limit=100&offset=0&sort=desc");

  const page = { contacts: [contact(3), contact(2), contact(1)], count: 3 };
  const first = await contactCreated.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  const retry = await contactCreated.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  assert.deepEqual(first.events, [contact(3)]);
  assert.deepEqual(retry, first);
});

test("brevo contact-created: a bulk import over one page is paged to the resume position, none lost", async () => {
  const seeded = await contactCreated.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { contacts: [contact(1)], count: 1 } }]).ctx,
  );
  const ids = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => contact(to - i));
  const m = mockCtx([
    { body: { contacts: ids(152, 251), count: 251 } },
    { body: { contacts: ids(52, 151), count: 251 } },
    { body: { contacts: [...ids(2, 51), contact(1)], count: 251 } },
  ]);
  const got = await contactCreated.poll!({ ...input, state: seeded.nextState }, m.ctx);
  assert.deepEqual(m.calls.map((c) => c.url), [
    "https://api.brevo.com/v3/contacts?limit=100&offset=0&sort=desc",
    "https://api.brevo.com/v3/contacts?limit=100&offset=100&sort=desc",
    "https://api.brevo.com/v3/contacts?limit=100&offset=200&sort=desc",
  ]);
  // maxEvents (100) holds back the newest; those are not marked seen and arrive next check.
  assert.equal(got.events.length, 100);
  assert.equal((got.events[0] as { id: number }).id, 2);
  const m2 = mockCtx([
    { body: { contacts: ids(152, 251), count: 251 } },
    { body: { contacts: ids(52, 151), count: 251 } },
    { body: { contacts: [...ids(2, 51), contact(1)], count: 251 } },
  ]);
  const more = await contactCreated.poll!({ ...input, state: got.nextState }, m2.ctx);
  assert.deepEqual(
    [...got.events, ...more.events].map((e) => (e as { id: number }).id),
    Array.from({ length: 200 }, (_, i) => i + 2),
  );
});

const sender = (id: number, name = "S") => ({
  id,
  name,
  email: `s${id}@example.com`,
  active: true,
});

test("brevo new-sender: seeds, emits a newly added sender once, idempotent, literal request", async () => {
  const seeded = await newSender.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { senders: [sender(1)] } }]).ctx,
  );
  assert.deepEqual(seeded.events, []);
  assert.equal((seeded.nextState as { seeded?: boolean }).seeded, true);
  const body = { senders: [sender(1), sender(2, "New")] };
  const m = mockCtx([{ body }]);
  const first = await newSender.poll!({ ...input, state: seeded.nextState }, m.ctx);
  assert.deepEqual(first.events, [sender(2, "New")]);
  assert.deepEqual(m.calls.map((c) => [c.method, c.url]), [[
    "GET",
    "https://api.brevo.com/v3/senders",
  ]]);
  const retry = await newSender.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body }]).ctx,
  );
  assert.deepEqual(retry, first);
  const next = await newSender.poll!({ ...input, state: first.nextState }, mockCtx([{ body }]).ctx);
  assert.deepEqual(next.events, []);
});
