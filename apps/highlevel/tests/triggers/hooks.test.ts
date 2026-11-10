import { test } from "node:test";
import { generateKeyPairSync, sign as edSign } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import { GHL_PUBLIC_KEY_SPKI, webhookTrigger } from "../../lib/triggers.ts";
import contactCreated from "../../triggers/contact-created.ts";
import opportunityCreated from "../../triggers/opportunity-created.ts";
import appointmentCreated from "../../triggers/appointment-created.ts";
import inboundMessage from "../../triggers/inbound-message.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Independent of app code: node:crypto Ed25519 keypair standing in for HighLevel's private key.
const pair = generateKeyPairSync("ed25519");
const other = generateKeyPairSync("ed25519");
const spki = (k: typeof pair) =>
  k.publicKey.export({ type: "spki", format: "der" }).toString("base64");
const TEST_KEY = spki(pair);
const sign = (body: string, k = pair) =>
  edSign(null, Buffer.from(body, "utf8"), k.privateKey).toString("base64");

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const BODIES: Record<string, string> = {
  ContactCreate: `{ "type" : "ContactCreate",  "locationId":"loc1", "id":"c1",
    "name":"John  Deo", "email":"john@example.com", "tags":[ "a", "b" ] }`,
  OpportunityCreate: `{ "type":"OpportunityCreate" , "locationId":"loc1", "id":"o1",
    "contactId":"c9", "status":"open",  "monetaryValue":40 }`,
  AppointmentCreate: `{ "type" : "AppointmentCreate", "locationId":"loc1",
    "appointment" : { "id":"a1", "contactId":"c7",  "title":"Visit" } }`,
  InboundMessage: `{ "type":"InboundMessage", "locationId":"loc1", "messageId":"m1",
    "conversationId":"cv1", "contactId":"c5", "body":"hi  there", "direction":"inbound" }`,
};

const call = (
  b: string | null,
  over: { headers?: Record<string, string>; method?: string; omitRaw?: boolean } = {},
) => ({
  raw: {
    method: over.method ?? "POST",
    path: "/",
    query: {},
    headers: over.headers ?? (b === null ? {} : { "x-ghl-signature": sign(b) }),
    body: b === null ? null : JSON.parse(b),
    ...(b === null || over.omitRaw ? {} : { rawBody: b }),
  },
  params: {},
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const shipped = [
  {
    t: contactCreated,
    key: "contact-created",
    type: "ContactCreate",
    id: "c1",
    contact: "c1",
    conv: null,
  },
  {
    t: opportunityCreated,
    key: "opportunity-created",
    type: "OpportunityCreate",
    id: "o1",
    contact: "c9",
    conv: null,
  },
  {
    t: appointmentCreated,
    key: "appointment-created",
    type: "AppointmentCreate",
    id: "a1",
    contact: "c7",
    conv: null,
  },
  {
    t: inboundMessage,
    key: "inbound-message",
    type: "InboundMessage",
    id: "m1",
    contact: "c5",
    conv: "cv1",
  },
];

// The same triggers (same event type and sample) built around the test public key.
const withTestKey = (s: (typeof shipped)[number]) =>
  webhookTrigger({
    key: s.key,
    title: s.t.title,
    description: s.t.description,
    eventType: s.type,
    sample: s.t.sample as never,
  }, TEST_KEY);

type Ingest = (typeof contactCreated)["handleIngest"];
const run = (t: { handleIngest?: Ingest }, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

test("fixtures have non-canonical whitespace", () => {
  for (const b of Object.values(BODIES)) assert(JSON.stringify(JSON.parse(b)) !== b);
});

test("app declares the four webhook triggers with output and sample, no poll, no secret param", () => {
  assertEquals(app.triggers.map((t) => t.key), shipped.map((s) => s.key));
  for (const { t } of shipped) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
    assert(!(t.params ?? []).some((p) => p.type === "secret"));
  }
});

test("the shipped key is HighLevel's documented Ed25519 SPKI and imports as one", async () => {
  assertEquals(GHL_PUBLIC_KEY_SPKI, "MCowBQYDK2VwAyEAi2HR1srL4o18O8BRa7gVJY7G7bupbN3H9AwJrHCDiOg=");
  const der = Buffer.from(GHL_PUBLIC_KEY_SPKI, "base64");
  assertEquals(der.subarray(0, 12).toString("hex"), "302a300506032b6570032100");
  await crypto.subtle.importKey("spki", der, { name: "Ed25519" }, false, ["verify"]);
});

for (const s of shipped) {
  const t = withTestKey(s);
  const body = BODIES[s.type];

  test(`${s.type}: valid Ed25519 signature over the exact body → one normalised event`, async () => {
    const out = evs(await run(t, call(body))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].type, s.type);
    assertEquals(out[0].locationId, "loc1");
    assertEquals(out[0].id, s.id);
    assertEquals(out[0].contactId, s.contact);
    assertEquals(out[0].conversationId, s.conv);
  });

  test(`${s.type}: the SHIPPED trigger (HighLevel's real key) refuses a delivery signed by another key`, async () => {
    await assertRejects(async () => await run(s.t, call(body)), Error, "does not verify");
  });

  test(`${s.type}: one flipped byte in the body → throws`, async () => {
    const flipped = body.replace("loc1", "loc2");
    await assertRejects(
      async () => await run(t, call(flipped, { headers: { "x-ghl-signature": sign(body) } })),
      Error,
      "does not verify",
    );
  });

  test(`${s.type}: signature header missing, empty or N/A → throws`, async () => {
    for (const headers of [{}, { "x-ghl-signature": "" }, { "x-ghl-signature": "N/A" }]) {
      await assertRejects(
        async () => await run(t, call(body, { headers })),
        Error,
        "X-GHL-Signature",
      );
    }
  });

  test(`${s.type}: only the deprecated X-WH-Signature header present → throws`, async () => {
    await assertRejects(
      async () => await run(t, call(body, { headers: { "x-wh-signature": sign(body) } })),
      Error,
      "X-GHL-Signature",
    );
  });

  test(`${s.type}: rawBody absent → throws`, async () => {
    await assertRejects(async () => await run(t, call(body, { omitRaw: true })), Error, "raw body");
  });

  test(`${s.type}: signature by a different key, or garbage/truncated base64 → throws`, async () => {
    for (const sig of [sign(body, other), "not base64 !!", sign(body).slice(0, 20), "AAAA"]) {
      await assertRejects(
        async () => await run(t, call(body, { headers: { "x-ghl-signature": sig } })),
        Error,
        "does not verify",
      );
    }
  });
}

test("a verified event of another type is acknowledged without a run", async () => {
  const t = withTestKey(shipped[0]);
  assertEquals(evs(await run(t, call(BODIES.OpportunityCreate))), []);
});

test("a verified body that is not JSON or not an event throws; a GET is refused", async () => {
  const t = withTestKey(shipped[0]);
  const notJson = "no json";
  const input = call(BODIES.ContactCreate);
  await assertRejects(
    async () =>
      await run(t, {
        ...input,
        raw: { ...input.raw, rawBody: notJson, headers: { "x-ghl-signature": sign(notJson) } },
      }),
    Error,
    "not JSON",
  );
  const noType = '{ "id" : "x" }';
  await assertRejects(async () => await run(t, call(noType)), Error, "type");
  await assertRejects(
    async () => await run(t, call(BODIES.ContactCreate, { method: "GET" })),
    Error,
    "POST",
  );
});

test("errors never echo the signature or the body", async () => {
  const t = withTestKey(shipped[0]);
  const bad = sign(BODIES.ContactCreate, other);
  try {
    await run(t, call(BODIES.ContactCreate, { headers: { "x-ghl-signature": bad } }));
    assert(false, "should have thrown");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(bad) && !m.includes("john@example.com") && !m.includes(TEST_KEY));
  }
});

test("onSubscribe hands back the callback URL and makes no vendor call", async () => {
  const { ctx, calls } = mockCtx([]);
  const state = await contactCreated.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await contactCreated.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
  assertEquals(calls.length, 0);
});
