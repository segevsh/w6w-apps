import { test } from "node:test";
import { generateKeyPairSync, sign as edSign } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import { anyEventTrigger, GHL_PUBLIC_KEY_SPKI, webhookTrigger } from "../../lib/triggers.ts";
import contactUpdated from "../../triggers/contact-updated.ts";
import contactDeleted from "../../triggers/contact-deleted.ts";
import contactTagUpdated from "../../triggers/contact-tag-updated.ts";
import opportunityUpdated from "../../triggers/opportunity-updated.ts";
import opportunityDeleted from "../../triggers/opportunity-deleted.ts";
import opportunityStageChanged from "../../triggers/opportunity-stage-changed.ts";
import opportunityStatusChanged from "../../triggers/opportunity-status-changed.ts";
import appointmentUpdated from "../../triggers/appointment-updated.ts";
import appointmentDeleted from "../../triggers/appointment-deleted.ts";
import outboundMessage from "../../triggers/outbound-message.ts";
import locationCreated from "../../triggers/location-created.ts";
import locationUpdated from "../../triggers/location-updated.ts";
import anyEvent from "../../triggers/any-event.ts";

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
/** A valid signature with one byte of the SIGNATURE itself flipped. */
const flipSignatureByte = (body: string) => {
  const sig = Buffer.from(sign(body), "base64");
  sig[10] ^= 0x01;
  return sig.toString("base64");
};

// Literal vendor-shaped bodies, pretty-printed so JSON.stringify(JSON.parse(b)) !== b.
const body = (o: Record<string, unknown>) => JSON.stringify(o, null, 3);
const CONTACT = { locationId: "loc1", id: "c1", name: "John  Deo", tags: ["a", "b"] };
const OPP = { locationId: "loc1", id: "o1", contactId: "c9", status: "open", monetaryValue: 40 };
const APPT = { locationId: "loc1", appointment: { id: "a1", contactId: "c7", title: "Visit" } };
const MSG = {
  locationId: "loc1",
  messageId: "m1",
  conversationId: "cv1",
  contactId: "c5",
  body: "hi  there",
  direction: "outbound",
};
const LOC = { id: "loc1", companyId: "co1", name: "Acme  HQ", email: "a@example.com" };

interface Row {
  t: typeof contactUpdated;
  key: string;
  type: string;
  b: string;
  id: string;
  contact: string | null;
  conv: string | null;
  location: string;
}
const rows: Row[] = [
  {
    t: contactUpdated,
    key: "contact-updated",
    type: "ContactUpdate",
    b: body({ type: "ContactUpdate", ...CONTACT }),
    id: "c1",
    contact: "c1",
    conv: null,
    location: "loc1",
  },
  {
    t: contactDeleted,
    key: "contact-deleted",
    type: "ContactDelete",
    b: body({ type: "ContactDelete", ...CONTACT }),
    id: "c1",
    contact: "c1",
    conv: null,
    location: "loc1",
  },
  {
    t: contactTagUpdated,
    key: "contact-tag-updated",
    type: "ContactTagUpdate",
    b: body({ type: "ContactTagUpdate", ...CONTACT }),
    id: "c1",
    contact: "c1",
    conv: null,
    location: "loc1",
  },
  {
    t: opportunityUpdated,
    key: "opportunity-updated",
    type: "OpportunityUpdate",
    b: body({ type: "OpportunityUpdate", ...OPP }),
    id: "o1",
    contact: "c9",
    conv: null,
    location: "loc1",
  },
  {
    t: opportunityDeleted,
    key: "opportunity-deleted",
    type: "OpportunityDelete",
    b: body({ type: "OpportunityDelete", ...OPP }),
    id: "o1",
    contact: "c9",
    conv: null,
    location: "loc1",
  },
  {
    t: opportunityStageChanged,
    key: "opportunity-stage-changed",
    type: "OpportunityStageUpdate",
    b: body({ type: "OpportunityStageUpdate", ...OPP, pipelineStageId: "st2" }),
    id: "o1",
    contact: "c9",
    conv: null,
    location: "loc1",
  },
  {
    t: opportunityStatusChanged,
    key: "opportunity-status-changed",
    type: "OpportunityStatusUpdate",
    b: body({ type: "OpportunityStatusUpdate", ...OPP, status: "won" }),
    id: "o1",
    contact: "c9",
    conv: null,
    location: "loc1",
  },
  {
    t: appointmentUpdated,
    key: "appointment-updated",
    type: "AppointmentUpdate",
    b: body({ type: "AppointmentUpdate", ...APPT }),
    id: "a1",
    contact: "c7",
    conv: null,
    location: "loc1",
  },
  {
    t: appointmentDeleted,
    key: "appointment-deleted",
    type: "AppointmentDelete",
    b: body({ type: "AppointmentDelete", ...APPT }),
    id: "a1",
    contact: "c7",
    conv: null,
    location: "loc1",
  },
  {
    t: outboundMessage,
    key: "outbound-message",
    type: "OutboundMessage",
    b: body({ type: "OutboundMessage", ...MSG }),
    id: "m1",
    contact: "c5",
    conv: "cv1",
    location: "loc1",
  },
  {
    t: locationCreated,
    key: "location-created",
    type: "LocationCreate",
    b: body({ type: "LocationCreate", ...LOC }),
    id: "loc1",
    contact: null,
    conv: null,
    location: "loc1",
  },
  {
    t: locationUpdated,
    key: "location-updated",
    type: "LocationUpdate",
    b: body({ type: "LocationUpdate", ...LOC }),
    id: "loc1",
    contact: null,
    conv: null,
    location: "loc1",
  },
];

const call = (
  b: string | null,
  over: {
    headers?: Record<string, string>;
    method?: string;
    omitRaw?: boolean;
    params?: Record<string, unknown>;
  } = {},
) => ({
  raw: {
    method: over.method ?? "POST",
    path: "/",
    query: {},
    headers: over.headers ?? (b === null ? {} : { "x-ghl-signature": sign(b) }),
    body: b === null ? null : JSON.parse(b),
    ...(b === null || over.omitRaw ? {} : { rawBody: b }),
  },
  params: over.params ?? {},
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

type Ingest = (typeof contactUpdated)["handleIngest"];
const run = (t: { handleIngest?: Ingest }, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

// The same triggers (same event type and sample) built around the test public key.
const withTestKey = (r: Row) =>
  webhookTrigger({
    key: r.key,
    title: r.t.title,
    description: r.t.description,
    eventType: r.type,
    sample: r.t.sample as never,
  }, TEST_KEY);

test("fixtures have non-canonical whitespace", () => {
  for (const r of rows) assert(JSON.stringify(JSON.parse(r.b)) !== r.b);
});

test("app wires every new webhook trigger, each with output, sample, no poll and no secret param", () => {
  const keys = app.triggers.map((t) => t.key);
  for (const r of rows) {
    assert(keys.includes(r.key), r.key);
    const t = app.triggers.find((x) => x.key === r.key)!;
    assertEquals(t.title, r.t.title);
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
    assert(!(t.params ?? []).some((p) => p.type === "secret"));
  }
  assert(keys.includes("any-event"));
});

for (const r of rows) {
  const t = withTestKey(r);

  test(`${r.type}: valid Ed25519 signature over the exact body → one normalised event`, async () => {
    const out = evs(await run(t, call(r.b))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].type, r.type);
    assertEquals(out[0].locationId, r.location);
    assertEquals(out[0].id, r.id);
    assertEquals(out[0].contactId, r.contact);
    assertEquals(out[0].conversationId, r.conv);
  });

  test(`${r.type}: the SHIPPED trigger (HighLevel's real key) refuses a delivery signed by another key`, async () => {
    await assertRejects(async () => await run(r.t, call(r.b)), Error, "does not verify");
  });

  test(`${r.type}: one flipped byte in the SIGNATURE → throws`, async () => {
    await assertRejects(
      async () =>
        await run(t, call(r.b, { headers: { "x-ghl-signature": flipSignatureByte(r.b) } })),
      Error,
      "does not verify",
    );
  });

  test(`${r.type}: one flipped byte in the body → throws`, async () => {
    const flipped = r.b.replace("loc1", "loc2");
    await assertRejects(
      async () => await run(t, call(flipped, { headers: { "x-ghl-signature": sign(r.b) } })),
      Error,
      "does not verify",
    );
  });

  test(`${r.type}: signature header missing, empty or N/A, or only the legacy header → throws`, async () => {
    for (
      const headers of [{}, { "x-ghl-signature": "" }, { "x-ghl-signature": "N/A" }, {
        "x-wh-signature": sign(r.b),
      }]
    ) {
      await assertRejects(
        async () => await run(t, call(r.b, { headers })),
        Error,
        "X-GHL-Signature",
      );
    }
  });

  test(`${r.type}: rawBody absent → throws`, async () => {
    await assertRejects(async () => await run(t, call(r.b, { omitRaw: true })), Error, "raw body");
  });

  test(`${r.type}: a delivery of another event type is acknowledged without a run`, async () => {
    const otherType = body({ type: "TaskCreate", locationId: "loc1", id: "t1" });
    assertEquals(evs(await run(t, call(otherType))), []);
  });
}

test("a GET is refused", async () => {
  const r = rows[0];
  await assertRejects(
    async () => await run(withTestKey(r), call(r.b, { method: "GET" })),
    Error,
    "POST",
  );
});

test("onSubscribe hands back the callback URL and makes no vendor call (new triggers)", async () => {
  for (const t of [contactUpdated, locationUpdated, anyEvent]) {
    const { ctx, calls } = mockCtx([]);
    const state = await t.onSubscribe!(
      { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
      ctx,
    );
    assertEquals(state, { callbackUrl: CALLBACK });
    await t.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
    assertEquals(calls.length, 0);
  }
});

// ---- Any event ----

const anyT = anyEventTrigger({
  key: "any-event",
  title: anyEvent.title,
  description: anyEvent.description,
  sample: anyEvent.sample as never,
}, TEST_KEY);
const TASK = body({ type: "TaskCreate", locationId: "loc1", id: "t1", contactId: "c3" });
const NOTE = body({ type: "NoteCreate", locationId: "loc1", id: "n1" });

test("any-event: declares an events param, no secret, and is the shipped export", () => {
  assertEquals(anyEvent.key, "any-event");
  assertEquals((anyEvent.params ?? []).map((p) => [p.key, p.type]), [["events", "string"]]);
  assertEquals(app.triggers.some((t) => t === anyEvent), true);
});

test("any-event: empty or blank events lets every verified event type through", async () => {
  for (const events of [undefined, "", "  , "]) {
    for (const b of [TASK, NOTE, rows[0].b]) {
      const out = evs(await run(anyT, call(b, { params: { events } }))) as Array<
        Record<string, unknown>
      >;
      assertEquals(out.length, 1);
      assertEquals(out[0].type, JSON.parse(b).type);
    }
  }
});

test("any-event: the events filter keeps only the listed types (comma list, case-insensitive)", async () => {
  const params = { events: "TaskCreate, contactupdate" };
  assertEquals(
    (evs(await run(anyT, call(TASK, { params }))) as Array<Record<string, unknown>>)[0].id,
    "t1",
  );
  assertEquals(
    (evs(await run(anyT, call(rows[0].b, { params }))) as Array<Record<string, unknown>>)[0].type,
    "ContactUpdate",
  );
  assertEquals(evs(await run(anyT, call(NOTE, { params }))), []);
});

test("any-event: the filter applies after the signature check, never instead of it", async () => {
  const params = { events: "NoteCreate" };
  await assertRejects(
    async () =>
      await run(anyT, call(NOTE, { params, headers: { "x-ghl-signature": sign(NOTE, other) } })),
    Error,
    "does not verify",
  );
});

test("any-event: one flipped byte in the SIGNATURE → throws", async () => {
  await assertRejects(
    async () =>
      await run(anyT, call(TASK, { headers: { "x-ghl-signature": flipSignatureByte(TASK) } })),
    Error,
    "does not verify",
  );
});

test("any-event: one flipped byte in the body → throws", async () => {
  await assertRejects(
    async () =>
      await run(
        anyT,
        call(TASK.replace("loc1", "loc2"), { headers: { "x-ghl-signature": sign(TASK) } }),
      ),
    Error,
    "does not verify",
  );
});

test("any-event: header missing, empty, N/A or only the legacy one → throws", async () => {
  for (
    const headers of [{}, { "x-ghl-signature": "" }, { "x-ghl-signature": "N/A" }, {
      "x-wh-signature": sign(TASK),
    }]
  ) {
    await assertRejects(
      async () => await run(anyT, call(TASK, { headers })),
      Error,
      "X-GHL-Signature",
    );
  }
});

test("any-event: rawBody absent → throws; the SHIPPED trigger refuses another key; GET refused", async () => {
  await assertRejects(
    async () => await run(anyT, call(TASK, { omitRaw: true })),
    Error,
    "raw body",
  );
  await assertRejects(async () => await run(anyEvent, call(TASK)), Error, "does not verify");
  await assertRejects(async () => await run(anyT, call(TASK, { method: "GET" })), Error, "POST");
});

test("any-event: errors never echo the signature, the body or the key", async () => {
  const bad = sign(TASK, other);
  try {
    await run(anyT, call(TASK, { headers: { "x-ghl-signature": bad } }));
    assert(false, "should have thrown");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(bad) && !m.includes("t1") && !m.includes(TEST_KEY));
  }
});

test("the shipped key is still HighLevel's documented Ed25519 SPKI", () => {
  assertEquals(GHL_PUBLIC_KEY_SPKI, "MCowBQYDK2VwAyEAi2HR1srL4o18O8BRa7gVJY7G7bupbN3H9AwJrHCDiOg=");
});
