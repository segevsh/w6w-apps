import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import contactPromotion from "../../triggers/contact-promotion.ts";
import contactCompanyChange from "../../triggers/contact-company-change.ts";
import companyHiringSurge from "../../triggers/company-hiring-surge.ts";
import companyHeadcountChange from "../../triggers/company-headcount-change.ts";
import companyNews from "../../triggers/company-news.ts";
import signalReceived from "../../triggers/signal-received.ts";

// Five named signal triggers share one case set; the expected scope of each is a literal here.
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-account-secret-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const NOW = Math.floor(Date.now() / 1000);

const sig = (ts: string, body: string, key = SECRET) =>
  createHmac("sha256", key).update(`${ts}.${body}`).digest("hex");
const flipFirstHexChar = (s: string) => (s[0] === "0" ? "1" : "0") + s.slice(1);

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const body = (type: string, entityType: string, id = "evt-1") =>
  `{ "id" : "${id}",  "type":"${type}", "entityType": "${entityType}",
  "entityId":"4158887495", "subscriptionId" : "sub-9",
  "data": { "companyName":"Acme  Corp" },
  "timestamp":"2026-11-10T10:30:00.000Z", "billing": { "creditsCharged": 1 } }`;

const specs = [
  {
    name: "contact-promotion",
    trigger: contactPromotion,
    entity: "contact",
    types: ["promotion"],
    other: "companyChange",
  },
  {
    name: "contact-company-change",
    trigger: contactCompanyChange,
    entity: "contact",
    types: ["companyChange"],
    other: "promotion",
  },
  {
    name: "company-hiring-surge",
    trigger: companyHiringSurge,
    entity: "company",
    types: ["surgeInHiring", "surgeInHiringByDepartment", "surgeInHiringByLocation"],
    other: "riskNews",
  },
  {
    name: "company-headcount-change",
    trigger: companyHeadcountChange,
    entity: "company",
    types: [
      "headcountIncrease1m",
      "headcountIncrease3m",
      "headcountIncrease6m",
      "headcountIncrease12m",
      "headcountDecrease1m",
      "headcountDecrease3m",
      "headcountDecrease6m",
      "headcountDecrease12m",
    ],
    other: "surgeInHiring",
  },
  {
    name: "company-news",
    trigger: companyNews,
    entity: "company",
    types: [
      "commercialActivityNews",
      "corporateStrategyNews",
      "financialEventsNews",
      "marketIntelligenceNews",
      "peopleNews",
      "productActivityNews",
      "riskNews",
    ],
    other: "surgeInHiring",
  },
];

type Trigger = typeof contactPromotion;
const call = (
  rawBody: string | null,
  headers: Record<string, string>,
  secret: string | null = SECRET,
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers,
    body: rawBody === null ? null : JSON.parse(rawBody),
    ...(rawBody === null ? {} : { rawBody }),
  },
  params: { entityIds: "1,2", signingSecret: (secret ?? undefined) as string },
  state: { subscriptionIds: ["sub-9"] },
  subscriptionId: "sub_1",
});
const signed = (b: string, ts = String(NOW), key = SECRET) => ({
  "x-lusha-signature": sig(ts, b, key),
  "x-lusha-timestamp": ts,
});
const ingest = (t: Trigger, input: ReturnType<typeof call>) =>
  t.handleIngest!(input as never, mockCtx().ctx);

async function refused(fn: () => Promise<unknown>, includes: string) {
  try {
    await fn();
  } catch (err) {
    assert(err instanceof Error && err.message.includes(includes), `message: ${String(err)}`);
    return;
  }
  throw new Error("expected the delivery to be refused");
}

test("the app wires the five named signal triggers next to the Any-signal one", () => {
  const keys = app.triggers.map((t) => t.key);
  assertEquals(keys.slice(0, 1), ["signal-received"]);
  for (const s of specs) {
    assert(app.triggers.some((t) => t === s.trigger), s.name);
    assertEquals(s.trigger.key, s.name);
    assert(s.trigger.output!.length > 0);
    assert(s.trigger.sample !== undefined);
    assertEquals(s.trigger.poll, undefined);
    assertEquals(typeof s.trigger.onSubscribe, "function");
    assertEquals(typeof s.trigger.onUnsubscribe, "function");
    // fixed scope: only the ids and the secret are asked for
    assertEquals(s.trigger.params!.map((p) => p.key), ["entityIds", "signingSecret"]);
    assertEquals(s.trigger.params!.find((p) => p.key === "signingSecret")!.type, "secret");
  }
  // the Any-signal trigger keeps its full filter surface
  assertEquals(signalReceived.params!.map((p) => p.key), [
    "entityType",
    "entityIds",
    "signalTypes",
    "signingSecret",
  ]);
});

for (const s of specs) {
  const { name, trigger, entity, types, other } = s;
  const type = types[0];
  const b = body(type, entity);

  test(`${name}: fixture has non-canonical whitespace`, () => {
    assert(JSON.stringify(JSON.parse(b)) !== b);
  });

  test(`${name}: onSubscribe registers exactly its entity type and signal types`, async () => {
    const m = mockCtx([{
      status: 201,
      body: {
        results: [
          { index: 0, success: true, subscription: { id: "s-1" } },
          { index: 1, success: true, subscription: { id: "s-2" } },
        ],
      },
    }]);
    const state = await trigger.onSubscribe!(
      // a stray entityType / signalTypes param must not widen or change the fixed scope
      {
        params: { entityIds: "11, 22", entityType: "other", signalTypes: "somethingElse" },
        callbackUrl: CALLBACK,
        subscriptionId: "sub_1",
      } as never,
      m.ctx,
    );
    assertEquals(state, { subscriptionIds: ["s-1", "s-2"] });
    assertEquals(m.calls.length, 1);
    assertEquals(m.calls[0].method, "POST");
    assertEquals(m.calls[0].url, "https://api.lusha.com/api/subscriptions");
    assertEquals(JSON.parse(m.calls[0].body!), {
      defaults: { url: CALLBACK, entityType: entity, signalTypes: types },
      subscriptions: [{ entityId: "11" }, { entityId: "22" }],
    });
  });

  test(`${name}: valid signature (node:crypto) → one event and the required ack`, async () => {
    const result = await ingest(trigger, call(b, signed(b)));
    const out = evs(result) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].type, type);
    assertEquals(out[0].entityType, entity);
    const res = (result as { response: { status: number; body: string } }).response;
    assertEquals(res.status, 200);
    assertEquals(JSON.parse(res.body).received, true);
    assertEquals(JSON.parse(res.body).webhookId, "evt-1");
  });

  test(`${name}: every signal type it registers starts a run`, async () => {
    for (const t of types) {
      const bt = body(t, entity, `evt-${t}`);
      const out = evs(await ingest(trigger, call(bt, signed(bt)))) as Array<
        Record<string, unknown>
      >;
      assertEquals(out.map((e) => e.type), [t]);
    }
  });

  test(`${name}: a verified signal of another type is acknowledged without a run`, async () => {
    const bo = body(other, entity, "evt-other");
    const result = await ingest(trigger, call(bo, signed(bo)));
    assertEquals(evs(result), []);
    const res = (result as { response: { status: number; body: string } }).response;
    assertEquals(res.status, 200);
    assertEquals(JSON.parse(res.body).webhookId, "evt-other");
  });

  test(`${name}: one flipped byte in the SIGNATURE → refused`, async () => {
    const h = signed(b);
    await refused(
      () =>
        ingest(
          trigger,
          call(b, { ...h, "x-lusha-signature": flipFirstHexChar(h["x-lusha-signature"]) }),
        ),
      "signature",
    );
  });

  test(`${name}: one flipped byte in the body → refused`, async () => {
    const h = signed(b);
    await refused(() => ingest(trigger, call(b.replace("Acme", "Acne"), h)), "signature");
  });

  test(`${name}: signature made with another secret → refused`, async () => {
    await refused(
      () => ingest(trigger, call(b, signed(b, String(NOW), "another-secret-value-xxxxxxxxxxxx"))),
      "signature",
    );
  });

  test(`${name}: signature or timestamp header missing → refused`, async () => {
    const h = signed(b);
    await refused(
      () => ingest(trigger, call(b, { "x-lusha-timestamp": h["x-lusha-timestamp"] })),
      "missing",
    );
    await refused(
      () => ingest(trigger, call(b, { "x-lusha-signature": h["x-lusha-signature"] })),
      "missing",
    );
  });

  test(`${name}: stale or future timestamp → refused`, async () => {
    for (const delta of [-400, 400]) {
      await refused(() => ingest(trigger, call(b, signed(b, String(NOW + delta)))), "window");
    }
  });

  test(`${name}: rawBody absent → refused`, async () => {
    await refused(() => ingest(trigger, call(null, signed(b))), "raw body");
  });

  test(`${name}: unset or empty signing secret → refused before any compare`, async () => {
    for (const secret of [null, ""]) {
      await refused(() => ingest(trigger, call(b, signed(b), secret)), "secret");
    }
  });
}
