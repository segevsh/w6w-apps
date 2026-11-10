import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import authorisation from "../../triggers/payment-authorisation.ts";
import capture from "../../triggers/payment-capture.ts";
import cancellation from "../../triggers/payment-cancellation.ts";
import refund from "../../triggers/payment-refund.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// The example HMAC key published in Adyen's "Verify HMAC signatures" page (hex).
const KEY = "44782DEF547AAA06C910C43932B1EB0C71FC68D9D0C057550C48EC2ACF6BA056";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

type Item = Record<string, unknown>;

/** Independent of the app: Adyen's documented field list, ":"-joined, HMAC-SHA256, base64. */
const signed = (i: Item, key = KEY) => {
  const amount = i.amount as { value: number; currency: string };
  const text = [
    i.pspReference,
    i.originalReference ?? "",
    i.merchantAccountCode,
    i.merchantReference,
    amount.value,
    amount.currency,
    i.eventCode,
    i.success,
  ].join(":");
  return createHmac("sha256", Buffer.from(key, "hex")).update(text, "utf8").digest("base64");
};

const item = (eventCode: string, over: Item = {}): Item => ({
  amount: { value: 1130, currency: "EUR" },
  pspReference: "7914073381342284",
  eventCode,
  eventDate: "2026-11-10T09:15:00+01:00",
  merchantAccountCode: "TestMerchant",
  merchantReference: "TestPayment-1407325143704",
  paymentMethod: "visa",
  success: "true",
  ...over,
});

const withSig = (i: Item, key = KEY): Item => ({
  ...i,
  additionalData: { authCode: "053099", hmacSignature: signed(i, key) },
});

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const bodyOf = (items: Item[]) =>
  `{ "live" : "false",
  "notificationItems":[ ${
    items.map((i) => `{ "NotificationRequestItem" : ${JSON.stringify(i)} }`).join(" ,\n  ")
  } ] }`;

const AUTH = bodyOf([withSig(item("AUTHORISATION"))]);

const call = (
  b: string,
  over: Record<string, unknown> = {},
  key: string | undefined | null = KEY,
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: {} as Record<string, string>,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params: { hmacKey: key === null ? undefined : key },
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const ingest = (t: typeof authorisation, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(AUTH)) !== AUTH);
});

test("the signature scheme matches Adyen's published example", () => {
  const doc = {
    pspReference: "7914073381342284",
    merchantAccountCode: "TestMerchant",
    merchantReference: "TestPayment-1407325143704",
    amount: { value: 1130, currency: "EUR" },
    eventCode: "AUTHORISATION",
    success: "true",
  };
  assertEquals(signed(doc), "coqCmt/IZ4E3CzPvMY8zTjQVL5hYJUiBRg8UU+iCWo0=");
});

test("app declares the four webhook triggers with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "payment-authorisation",
    "payment-capture",
    "payment-cancellation",
    "payment-refund",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(t.params!.map((p) => p.key), ["hmacKey"]);
  }
});

test("valid signature → one normalized event per event code", async () => {
  const cases: Array<[typeof authorisation, string]> = [
    [authorisation, "AUTHORISATION"],
    [capture, "CAPTURE"],
    [cancellation, "CANCELLATION"],
    [refund, "REFUND"],
  ];
  for (const [t, code] of cases) {
    const body = bodyOf([withSig(item(code, { originalReference: "8814000000000001" }))]);
    const out = evs(await ingest(t, call(body))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].eventCode, code);
    assertEquals(out[0].success, true);
    assertEquals(out[0].pspReference, "7914073381342284");
    assertEquals(out[0].originalReference, "8814000000000001");
    assertEquals(out[0].amountValue, 1130);
    assertEquals(out[0].currency, "EUR");
    assertEquals(out[0].live, false);
    assertEquals(out[0].additionalData, { authCode: "053099" });
  }
});

test("another event code is acknowledged with no event", async () => {
  assertEquals(evs(await ingest(capture, call(AUTH))), []);
});

test("a failed outcome (success false) is still delivered", async () => {
  const body = bodyOf([withSig(item("REFUND", { success: "false", reason: "Refused" }))]);
  const out = evs(await ingest(refund, call(body))) as Array<Record<string, unknown>>;
  assertEquals(out[0].success, false);
  assertEquals(out[0].reason, "Refused");
});

test("one flipped byte in a signed field → refused", async () => {
  const forged = AUTH.replace("TestPayment-1407325143704", "TestPayment-1407325143705");
  assert(forged !== AUTH);
  await assertRejects(() => ingest(authorisation, call(forged)), Error, "signature");
});

test("a changed amount → refused", async () => {
  const forged = AUTH.replace('"value":1130', '"value":1');
  assert(forged !== AUTH);
  await assertRejects(() => ingest(authorisation, call(forged)), Error, "signature");
});

test("signature made with another key → refused", async () => {
  const other = "ab".repeat(32);
  const body = bodyOf([withSig(item("AUTHORISATION"), other)]);
  await assertRejects(() => ingest(authorisation, call(body)), Error, "signature");
});

test("signature missing → refused", async () => {
  const body = bodyOf([item("AUTHORISATION")]);
  await assertRejects(() => ingest(authorisation, call(body)), Error, "no HMAC signature");
});

test("rawBody absent → refused, even with a correct signature", async () => {
  const c = call(AUTH);
  delete (c.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(authorisation, c), Error, "raw body");
});

test("unset or empty key → refused", async () => {
  for (const key of [null, ""]) {
    await assertRejects(() => ingest(authorisation, call(AUTH, {}, key)), Error, "secret");
  }
});

test("a key that is not hexadecimal → refused without echoing it", async () => {
  const bad = "not-a-hex-key-value";
  try {
    await ingest(authorisation, call(AUTH, {}, bad));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(m.includes("hexadecimal") && !m.includes(bad));
  }
});

test("one forged item refuses the whole delivery", async () => {
  const good = withSig(item("AUTHORISATION"));
  const bad = { ...withSig(item("AUTHORISATION", { pspReference: "1" })), merchantReference: "x" };
  await assertRejects(() => ingest(authorisation, call(bodyOf([good, bad]))), Error, "signature");
});

test("a body that is not an Adyen Standard webhook → refused", async () => {
  await assertRejects(() => ingest(authorisation, call('{ "type" : "balancePlatform" }')), Error);
  const notJson = call(AUTH, { rawBody: "a=b&c=d" });
  await assertRejects(() => ingest(authorisation, notJson), Error, "not JSON");
});

test("errors never contain the key, the signature or the body", async () => {
  const forged = AUTH.replace("TestPayment-1407325143704", "TestPayment-1407325143705");
  const given = (JSON.parse(AUTH).notificationItems[0].NotificationRequestItem.additionalData as {
    hmacSignature: string;
  }).hmacSignature;
  try {
    await ingest(authorisation, call(forged));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(KEY) && !m.includes(given) && !m.includes("TestPayment"));
  }
});

test("tampering with an UNSIGNED field is not detected (Adyen signs eight fields only)", async () => {
  const body = AUTH.replace("2026-11-10T09:15:00+01:00", "2020-01-01T00:00:00+00:00");
  assert(body !== AUTH);
  const out = evs(await ingest(authorisation, call(body))) as Array<Record<string, unknown>>;
  assertEquals(out[0].eventDate, "2020-01-01T00:00:00+00:00");
});

test("a non-POST call is refused", async () => {
  await assertRejects(
    () => ingest(authorisation, call(AUTH, { method: "GET" })),
    Error,
    "POST",
  );
});

test("onSubscribe makes no vendor call and returns the callback URL; onUnsubscribe is a no-op", async () => {
  const { ctx, calls } = mockCtx();
  const state = await authorisation.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await authorisation.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
  assertEquals(calls.length, 0);
});
