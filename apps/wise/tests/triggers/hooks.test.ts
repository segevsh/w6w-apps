import { test } from "node:test";
import { createSign, generateKeyPairSync } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import transferStateChanged from "../../triggers/transfer-state-changed.ts";
import balanceUpdated from "../../triggers/balance-updated.ts";
import { spec as transferStateSpec } from "../../triggers/transfer-state-changed.ts";
import { spec as transferPayoutSpec } from "../../triggers/transfer-payout-failed.ts";
import { spec as balanceSpec } from "../../triggers/balance-updated.ts";
import { spec as profileSpec } from "../../triggers/profile-state-changed.ts";
import { spec as activeCasesSpec } from "../../triggers/transfer-active-cases.ts";
import { spec as refundSpec } from "../../triggers/transfer-refunded.ts";
import { spec as creditedSpec } from "../../triggers/balance-credited.ts";
import { spec as recipientSpec } from "../../triggers/recipient-changed.ts";
import {
  type PublicKeys,
  verifyRsaSha256,
  webhookTrigger,
  WISE_LIVE_PUBLIC_KEY,
  WISE_SANDBOX_PUBLIC_KEY,
} from "../../lib/triggers.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const HOST = "https://api.example.test";

// The Wise profile the user configured; `WISE_BODY` (Wise's own vector) is about profile 16055450.
const PROFILE = "222";
const WISE_PROFILE = "16055450";
const SUB = "01234567-89ab-cdef-0123-456789abcdef";

/** The signed webhook triggers (the app also ships poll triggers, covered in their own files). */
const webhookTriggers = () => (app.triggers ?? []).filter((t) => typeof t.poll !== "function");

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// A delivery signed by Wise itself: the body and signature are the ones in Wise's own reference
// implementation (github.com/transferwise/digital-signatures-examples, verify-webhook-signature
// /verify-signature.js), which verifies them against the SANDBOX public key. The signature was
// made by Wise, not by anything in this repo.
const WISE_BODY =
  '{"data":{"resource":{"id":49983981,"profile_id":16055450,"account_id":14124090,"type":"transfer"},"current_state":"incoming_payment_waiting","previous_state":null,"occurred_at":"2021-08-23T10:12:50Z"},"subscription_id":"90aa8e14-4ef1-4a56-861c-f3c9cde097ea","event_type":"transfers#state-change","schema_version":"2.0.0","sent_at":"2021-08-23T10:12:50Z"}';
const WISE_SIGNATURE =
  "wKcKCYXAzxNgiu7xmoDm943NUni7Rz33QN8JkEA9dWSGebgndonabgSj18Y4C08OrwVmueGsED2s00M7DtJVcYKOS1i3G4TMVx+mgM3aL9djMBkQtiYNBFUd6wrPI7ZUNHv/TrlKSjTMc+6JFvUvJ7owY3z85e3I4jLRLJowMFvO8kvCJ60+1pY9wDwZvtZ//WS93LrwGjk9Dvwzpmu0w+P4J75tETT5qC3Uv0y5G2yO8SEoO3yNP/tg/BOli02niHb53vEOUWUb9bly6thnfMoXoiV/osoGxgF20R58RlvkAmezyyl1Sv542TfS2DpiwVnmjjjkCyXeSUcKookYLQ==";

function delivery(
  rawBody: string | undefined,
  headers: Record<string, string>,
  method = "POST",
): TriggerCall {
  let body: unknown = rawBody;
  try {
    body = rawBody === undefined ? undefined : JSON.parse(rawBody);
  } catch { /* keep text */ }
  const call: TriggerCall = {
    method,
    path: "/triggers/webhooks/sub_abc",
    query: {},
    headers,
    body,
  };
  if (rawBody !== undefined) call.rawBody = rawBody;
  return call;
}

function ingest(
  trigger: typeof transferStateChanged,
  call: TriggerCall,
  environment: string | undefined,
  ...prof: [profileId?: string]
) {
  // omitted -> the configured PROFILE; an explicit undefined stays undefined (an unset param)
  const profileId = prof.length > 0 ? prof[0] : PROFILE;
  return trigger.handleIngest!(
    {
      raw: call,
      params: { environment, profileId },
      state: { callbackUrl: CALLBACK },
      subscriptionId: "s",
    },
    mockCtx().ctx,
  );
}

// ---- Wise-signed vector, through the shipped trigger and Wise's real pinned key -----------------

test("handleIngest: a delivery signed by Wise verifies against the pinned sandbox key", async () => {
  const call = delivery(WISE_BODY, {
    "X-Signature-SHA256": WISE_SIGNATURE,
    "X-Delivery-Id": "5a1d3c70-2b8e-4a6f-9f0e-7c2d1e4b8a93",
  });
  assertEquals(evs(await ingest(transferStateChanged, call, "sandbox", WISE_PROFILE)), [{
    eventType: "transfers#state-change",
    deliveryId: "5a1d3c70-2b8e-4a6f-9f0e-7c2d1e4b8a93",
    subscriptionId: "90aa8e14-4ef1-4a56-861c-f3c9cde097ea",
    schemaVersion: "2.0.0",
    sentAt: "2021-08-23T10:12:50Z",
    data: {
      resource: { id: 49983981, profile_id: 16055450, account_id: 14124090, type: "transfer" },
      current_state: "incoming_payment_waiting",
      previous_state: null,
      occurred_at: "2021-08-23T10:12:50Z",
    },
  }]);
});

test("handleIngest: the sandbox signature does not verify against the live key, and vice versa", async () => {
  const call = delivery(WISE_BODY, { "x-signature-sha256": WISE_SIGNATURE });
  await assertRejects(
    async () => await ingest(transferStateChanged, call, "live"),
    Error,
    "signature does not match",
  );
  // the default environment is live
  await assertRejects(
    async () => await ingest(transferStateChanged, call, undefined),
    Error,
    "signature does not match",
  );
});

test("handleIngest: one flipped byte in Wise's signed body throws", async () => {
  const call = delivery(WISE_BODY.replace("49983981", "49983982"), {
    "x-signature-sha256": WISE_SIGNATURE,
  });
  await assertRejects(
    async () => await ingest(transferStateChanged, call, "sandbox", WISE_PROFILE),
    Error,
    "signature does not match",
  );
});

test("handleIngest: a flipped byte in Wise's signature throws", async () => {
  const bad = (WISE_SIGNATURE[0] === "w" ? "x" : "w") + WISE_SIGNATURE.slice(1);
  await assertRejects(
    async () =>
      await ingest(
        transferStateChanged,
        delivery(WISE_BODY, { "x-signature-sha256": bad }),
        "sandbox",
        WISE_PROFILE,
      ),
    Error,
    "signature does not match",
  );
});

test("the pinned public keys are the two published ones and both import", async () => {
  assertEquals(WISE_LIVE_PUBLIC_KEY.includes("vO8vXV+JksBzZAY6GhSO"), true);
  assertEquals(WISE_SANDBOX_PUBLIC_KEY.includes("wpb91cEYuyJNQepZAVfP"), true);
  // importing a key and verifying a wrong signature returns false rather than throwing
  assertEquals(await verifyRsaSha256(WISE_LIVE_PUBLIC_KEY, "x", "AAAA"), false);
  assertEquals(await verifyRsaSha256(WISE_SANDBOX_PUBLIC_KEY, WISE_BODY, WISE_SIGNATURE), true);
});

// ---- Own key pair, for the cases Wise's fixed vector cannot cover --------------------------------

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const TEST_PEM = publicKey.export({ type: "spki", format: "pem" }).toString();
const OTHER_PEM = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey
  .export({ type: "spki", format: "pem" }).toString();
const KEYS: PublicKeys = { live: TEST_PEM, sandbox: OTHER_PEM };

/** The expected signature, computed with node:crypto — independent of the app's code. */
function sign(body: string): string {
  return createSign("RSA-SHA256").update(body).sign(privateKey, "base64");
}

const transfers = webhookTrigger({
  key: "t",
  title: "t",
  description: "t",
  eventType: "transfers#state-change",
  profilePath: ["resource", "profile_id"],
  sampleData: {},
}, KEYS);
const balances = webhookTrigger({
  key: "b",
  title: "b",
  description: "b",
  eventType: "balances#update",
  profilePath: ["resource", "profile_id"],
  sampleData: {},
}, KEYS);

/** A body with whitespace Wise's compact JSON never has, so re-serialising differs. */
const BODY = `{
  "data": { "resource": { "id": 111, "profile_id": 222, "type": "transfer" }, "current_state": "processing" },
  "subscription_id": "01234567-89ab-cdef-0123-456789abcdef",
  "event_type": "transfers#state-change",
  "schema_version": "4.0.0",
  "sent_at": "2026-11-09T10:12:50.123Z"
}`;

function signed(body = BODY, extra: Record<string, string> = {}): TriggerCall {
  return delivery(body, { "x-signature-sha256": sign(body), ...extra });
}

test("fixture: the body is not canonical JSON, so re-serialising would break the signature", () => {
  assertEquals(JSON.stringify(JSON.parse(BODY)) !== BODY, true);
});

test("handleIngest: a valid signature over the exact bytes yields the event", async () => {
  const out = evs(await ingest(transfers, signed(BODY, { "x-delivery-id": "d1" }), "live"));
  assertEquals(out, [{
    eventType: "transfers#state-change",
    deliveryId: "d1",
    subscriptionId: "01234567-89ab-cdef-0123-456789abcdef",
    schemaVersion: "4.0.0",
    sentAt: "2026-11-09T10:12:50.123Z",
    data: {
      resource: { id: 111, profile_id: 222, type: "transfer" },
      current_state: "processing",
    },
  }]);
});

test("handleIngest: one flipped byte in the body throws", async () => {
  const call = delivery(BODY.replace('"id": 111', '"id": 112'), {
    "x-signature-sha256": sign(BODY),
  });
  await assertRejects(async () => await ingest(transfers, call, "live"), Error, "signature");
});

test("handleIngest: a signature over re-serialised JSON is refused", async () => {
  const compact = JSON.stringify(JSON.parse(BODY));
  const call = delivery(BODY, { "x-signature-sha256": sign(compact) });
  await assertRejects(async () => await ingest(transfers, call, "live"), Error, "signature");
});

test("handleIngest: a signature by another key is refused", async () => {
  await assertRejects(async () => await ingest(transfers, signed(), "sandbox"), Error, "signature");
});

test("handleIngest: a missing, empty or malformed signature header throws", async () => {
  await assertRejects(
    async () => await ingest(transfers, delivery(BODY, {}), "live"),
    Error,
    "X-Signature-SHA256",
  );
  await assertRejects(
    async () => await ingest(transfers, delivery(BODY, { "x-signature-sha256": "" }), "live"),
    Error,
    "X-Signature-SHA256",
  );
  for (const junk of ["!!!notbase64!!!", "AAAA", "AA", sign(BODY).slice(0, 40)]) {
    await assertRejects(
      async () => await ingest(transfers, delivery(BODY, { "x-signature-sha256": junk }), "live"),
      Error,
      "signature",
    );
  }
});

test("handleIngest: an absent rawBody throws (never falls back to the parsed body)", async () => {
  const call = signed();
  delete call.rawBody;
  await assertRejects(async () => await ingest(transfers, call, "live"), Error, "raw body");
});

test("handleIngest: an unknown environment refuses rather than guessing a key", async () => {
  await assertRejects(
    async () => await ingest(transfers, signed(), "staging"),
    Error,
    "environment",
  );
});

test("handleIngest: error text never echoes the signature or the key", async () => {
  const messages: string[] = [];
  const bad = sign(BODY.replace("111", "222"));
  for (const call of [delivery(BODY, { "x-signature-sha256": bad }), delivery(BODY, {})]) {
    try {
      await ingest(transfers, call, "live");
    } catch (err) {
      messages.push((err as Error).message);
    }
  }
  assertEquals(messages.length, 2);
  for (const m of messages) {
    assertEquals(m.includes(bad) || m.includes(TEST_PEM) || m.includes("MIIB"), false);
  }
});

test("handleIngest: non-POST throws; another event type is acknowledged with none", async () => {
  await assertRejects(
    async () => await ingest(transfers, { ...signed(), method: "GET" }, "live"),
    Error,
    "POST",
  );
  assertEquals(evs(await ingest(balances, signed(), "live")), []);
});

test("handleIngest: a validly signed test notification starts no run; an unsigned one is refused", async () => {
  assertEquals(
    evs(await ingest(transfers, signed(BODY, { "x-test-notification": "true" }), "live")),
    [],
  );
  await assertRejects(
    async () => await ingest(transfers, delivery(BODY, { "x-test-notification": "true" }), "live"),
    Error,
    "X-Signature-SHA256",
  );
});

test("handleIngest: a validly signed body that is not an event throws", async () => {
  await assertRejects(
    async () => await ingest(transfers, signed('{ "hello": "world" }'), "live"),
    Error,
    "Not a Wise event",
  );
  await assertRejects(
    async () => await ingest(transfers, signed("[1]"), "live"),
    Error,
    "Not a Wise event",
  );
});

// ---- Declarations and the manual-webhook lifecycle ----------------------------------------------

test("the app declares nine webhook triggers, each with output and a sample", () => {
  const triggers = webhookTriggers();
  assertEquals(triggers.length, 9);
  for (const t of triggers) {
    assertEquals(typeof t.handleIngest, "function", t.key);
    assertEquals(typeof t.onSubscribe, "function", t.key);
    assertEquals(typeof t.onUnsubscribe, "function", t.key);
    assertEquals(typeof t.poll, "undefined", t.key);
    assertEquals((t.output?.length ?? 0) > 0, true, t.key);
    assertEquals(t.sample !== undefined, true, t.key);
  }
});

test("onSubscribe makes no Wise call and returns the callback URL; onUnsubscribe is a no-op", async () => {
  const { ctx, calls } = mockCtx();
  const state = await transferStateChanged.onSubscribe!(
    { params: {}, subscriptionId: "sub_abc", callbackUrl: CALLBACK, hostUrl: HOST },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await transferStateChanged.onUnsubscribe!(
    { params: {}, state: { callbackUrl: CALLBACK }, subscriptionId: "sub_abc" },
    ctx,
  );
  assertEquals(calls.length, 0);
});

test("handleIngest: a Wise-signed delivery of another event type is acknowledged with none", async () => {
  const call = delivery(WISE_BODY, { "x-signature-sha256": WISE_SIGNATURE });
  assertEquals(evs(await ingest(balanceUpdated, call, "sandbox", WISE_PROFILE)), []);
});

// ---- Profile binding: a valid Wise signature is not proof the delivery is for YOU ----------------

const REFUSED_PROFILE = "profile";

/**
 * The four shipped triggers, rebuilt with the test key pair, each with a literal body in the shape
 * Wise documents for its event (docs.wise.com/api-reference/webhook-event/*, 2026-11-09). The
 * `PROFILE` slot is `%P%` so a test can put any value, or nothing, where Wise puts the profile.
 */
interface Shipped {
  name: string;
  trigger: ReturnType<typeof webhookTrigger>;
  /** the body with `%P%` still in it, as a function of the profile slot's JSON text */
  body: (profileJson: string | null) => string;
  eventType: string;
  data: Record<string, unknown>;
}

const SIGNED_ENVELOPE = (eventType: string, data: string, schema: string) =>
  `{ "schema_version": "${schema}", "subscription_id": "${SUB}", "event_type": "${eventType}",
  "sent_at": "2026-11-09T10:12:50.123Z", "data": ${data} }`;

const SHIPPED: Shipped[] = [
  {
    name: "transfer-state-changed",
    trigger: webhookTrigger(transferStateSpec, KEYS),
    eventType: "transfers#state-change",
    body: (p) =>
      SIGNED_ENVELOPE(
        "transfers#state-change",
        `{ "resource": { "type": "transfer", "id": 111, ${
          p === null ? "" : `"profile_id": ${p}, `
        }"account_id": 333 }, "current_state": "processing", "previous_state": "x" }`,
        "4.0.0",
      ),
    data: {
      resource: { type: "transfer", id: 111, profile_id: 222, account_id: 333 },
      current_state: "processing",
      previous_state: "x",
    },
  },
  {
    name: "transfer-payout-failed",
    trigger: webhookTrigger(transferPayoutSpec, KEYS),
    eventType: "transfers#payout-failure",
    body: (p) =>
      SIGNED_ENVELOPE(
        "transfers#payout-failure",
        `{ "transfer_id": 111, ${
          p === null ? "" : `"profile_id": ${p}, `
        }"failure_reason_code": "TECHNICAL_ISSUE_RETRYABLE" }`,
        "5.0.0",
      ),
    data: { transfer_id: 111, profile_id: 222, failure_reason_code: "TECHNICAL_ISSUE_RETRYABLE" },
  },
  {
    name: "balance-updated",
    trigger: webhookTrigger(balanceSpec, KEYS),
    eventType: "balances#update",
    body: (p) =>
      SIGNED_ENVELOPE(
        "balances#update",
        `{ "resource": { "type": "balance-account", "id": 2${
          p === null ? "" : `, "profile_id": ${p}`
        } }, "amount": 70, "currency": "GBP", "transaction_type": "credit" }`,
        "4.0.0",
      ),
    data: {
      resource: { type: "balance-account", id: 2, profile_id: 222 },
      amount: 70,
      currency: "GBP",
      transaction_type: "credit",
    },
  },
  {
    // a profile event names the profile as its own resource id; with no id, nothing names it
    name: "profile-state-changed",
    trigger: webhookTrigger(profileSpec, KEYS),
    eventType: "profiles#state-change",
    body: (p) =>
      SIGNED_ENVELOPE(
        "profiles#state-change",
        `{ "resource": { ${
          p === null ? "" : `"id": ${p}, `
        }"type": "profile" }, "current_state": "VERIFIED", "requested_by_customer": false }`,
        "4.0.0",
      ),
    data: {
      resource: { id: 222, type: "profile" },
      current_state: "VERIFIED",
      requested_by_customer: false,
    },
  },
  {
    name: "transfer-active-cases",
    trigger: webhookTrigger(activeCasesSpec, KEYS),
    eventType: "transfers#active-cases",
    body: (p) =>
      SIGNED_ENVELOPE(
        "transfers#active-cases",
        `{ "resource": { "type": "transfer", "id": 111, ${
          p === null ? "" : `"profile_id": ${p}, `
        }"account_id": 333 }, "active_cases": [ "deposit_amount_less_invoice" ] }`,
        "4.0.0",
      ),
    data: {
      resource: { type: "transfer", id: 111, profile_id: 222, account_id: 333 },
      active_cases: ["deposit_amount_less_invoice"],
    },
  },
  {
    name: "transfer-refunded",
    trigger: webhookTrigger(refundSpec, KEYS),
    eventType: "transfers#refund",
    body: (p) =>
      SIGNED_ENVELOPE(
        "transfers#refund",
        `{ "resource": { "type": "transfer", "id": 111, ${
          p === null ? "" : `"profile_id": ${p}, `
        }"account_id": 333, "refund_amount": 5000, "refund_currency": "EUR" }, "occurred_at": "2026-11-09T10:12:50Z" }`,
        "4.0.0",
      ),
    data: {
      resource: {
        type: "transfer",
        id: 111,
        profile_id: 222,
        account_id: 333,
        refund_amount: 5000,
        refund_currency: "EUR",
      },
      occurred_at: "2026-11-09T10:12:50Z",
    },
  },
  {
    name: "balance-credited",
    trigger: webhookTrigger(creditedSpec, KEYS),
    eventType: "balances#update",
    body: (p) =>
      SIGNED_ENVELOPE(
        "balances#update",
        `{ "resource": { "type": "balance-account", "id": 2${
          p === null ? "" : `, "profile_id": ${p}`
        } }, "amount": 70, "currency": "GBP", "transaction_type": "credit" }`,
        "4.0.0",
      ),
    data: {
      resource: { type: "balance-account", id: 2, profile_id: 222 },
      amount: 70,
      currency: "GBP",
      transaction_type: "credit",
    },
  },
  {
    name: "recipient-changed",
    trigger: webhookTrigger(recipientSpec, KEYS),
    eventType: "recipients#state-change",
    body: (p) =>
      SIGNED_ENVELOPE(
        "recipients#state-change",
        `{ "resource": { "id": "700525176", "occurred_at": "2026-11-10T10:12:50Z",
          "data": { "recipientId": 700525176${
          p === null ? "" : `, "profileId": ${p}`
        }, "currency": "EUR", "state": "CREATE", "clientId": "sample-client" } } }`,
        "4.0.0",
      ),
    data: {
      resource: {
        id: "700525176",
        occurred_at: "2026-11-10T10:12:50Z",
        data: {
          recipientId: 700525176,
          profileId: 222,
          currency: "EUR",
          state: "CREATE",
          clientId: "sample-client",
        },
      },
    },
  },
];

test("every shipped trigger is covered here, and is what the spec builds", () => {
  // the Any Event trigger has its own file (event-hooks.test.ts)
  const shipped = webhookTriggers().filter((t) => t.key !== "any-event");
  assertEquals(shipped.map((t) => t.key).sort(), SHIPPED.map((s) => s.name).sort());
  for (const s of SHIPPED) {
    const real = shipped.find((t) => t.key === s.name)!;
    // same declaration as the one the app ships (the test only swaps the public keys)
    assertEquals(real.params, s.trigger.params, s.name);
    assertEquals(real.output, s.trigger.output, s.name);
    assertEquals(real.sample, s.trigger.sample, s.name);
  }
});

for (const s of SHIPPED) {
  const sign_ = (profileJson: string | null, extra: Record<string, string> = {}) =>
    signed(s.body(profileJson), extra);
  const expectEvent = (call: TriggerCall) => [{
    eventType: s.eventType,
    deliveryId: "d1",
    subscriptionId: SUB,
    schemaVersion: s.eventType === "transfers#payout-failure" ? "5.0.0" : "4.0.0",
    sentAt: "2026-11-09T10:12:50.123Z",
    data: JSON.parse(call.rawBody!).data,
  }];

  test(`${s.name}: the fixture matches Wise's documented data and is not canonical JSON`, () => {
    const body = s.body("222");
    assertEquals(JSON.stringify(JSON.parse(body)) !== body, true);
    assertEquals(JSON.parse(body).data, s.data);
  });

  test(`${s.name}: a signed delivery for the configured profile yields exactly the event`, async () => {
    const call = sign_("222", { "x-delivery-id": "d1" });
    assertEquals(
      evs(
        await s.trigger.handleIngest!(
          {
            raw: call,
            params: { environment: "live", profileId: "222" },
            state: { callbackUrl: CALLBACK },
            subscriptionId: "s",
          },
          mockCtx().ctx,
        ),
      ),
      expectEvent(call),
    );
    // the pasted id is trimmed; Wise sends it as a number, a string id is the same profile
    for (const [cfg, wire] of [[" 222\n", "222"], ["222", '"222"']] as const) {
      assertEquals(
        evs(
          await s.trigger.handleIngest!(
            {
              raw: sign_(wire),
              params: { environment: "live", profileId: cfg },
              state: { callbackUrl: CALLBACK },
              subscriptionId: "s",
            },
            mockCtx().ctx,
          ),
        ).length,
        1,
      );
    }
  });

  test(`${s.name}: a signed delivery for ANOTHER profile is refused, zero events`, async () => {
    for (const other of ["223", "22", "2220", '"0222"', '"222 "', '"2.22e2"', "-222", "1e2"]) {
      await assertRejects(
        async () => await ingest(s.trigger, sign_(other), "live"),
        Error,
        REFUSED_PROFILE,
      );
    }
    // and the configured value is what is compared: a different configured id refuses the real one
    for (const cfg of ["223", "22", "2220", " 22 2"]) {
      await assertRejects(
        async () => await ingest(s.trigger, sign_("222"), "live", cfg),
        Error,
        REFUSED_PROFILE,
      );
    }
  });

  test(`${s.name}: a signed delivery with no profile field (or an unusable one) is refused`, async () => {
    await assertRejects(
      async () => await ingest(s.trigger, sign_(null), "live"),
      Error,
      REFUSED_PROFILE,
    );
    for (const bad of ["null", '""', "{}", "[]", "true", "false", "1.5", "[222]", '{"id":222}']) {
      await assertRejects(
        async () => await ingest(s.trigger, sign_(bad), "live"),
        Error,
        REFUSED_PROFILE,
      );
    }
  });

  test(`${s.name}: only an integer or a non-empty string counts as a profile id`, async () => {
    // a non-integer number would stringify to something a user could type; it is not a profile
    for (const [cfg, wire] of [["1.5", "1.5"], ["1e+21", "1e21"], ["2.5", "2.5"]] as const) {
      await assertRejects(
        async () => await ingest(s.trigger, sign_(wire), "live", cfg),
        Error,
        REFUSED_PROFILE,
      );
    }
  });

  test(`${s.name}: an unset or blank configured profileId refuses every delivery (no fail-open)`, async () => {
    // a delivery that carries the real id, an empty id, none, and a null
    for (const configured of [undefined, "", "   ", "\n", null as unknown as string]) {
      for (const wire of ["222", '""', null, "null", '"undefined"', '"null"', '"5"']) {
        await assertRejects(
          async () => await ingest(s.trigger, sign_(wire), "live", configured),
          Error,
          REFUSED_PROFILE,
        );
      }
    }
    // also with no params object at all
    await assertRejects(
      async () =>
        await s.trigger.handleIngest!(
          {
            raw: sign_("222"),
            params: undefined as never,
            state: { callbackUrl: CALLBACK },
            subscriptionId: "s",
          },
          mockCtx().ctx,
        ),
      Error,
      REFUSED_PROFILE,
    );
  });

  test(`${s.name}: the profile is read from the signed body, never a header or the query`, async () => {
    const other = "999";
    // header and query carry the CONFIGURED profile; the signed body carries another -> refused
    const spoofed = sign_(other, { "x-profile-id": PROFILE, "x-wise-profile-id": PROFILE });
    spoofed.query = { profile_id: PROFILE, profileId: PROFILE };
    await assertRejects(
      async () => await ingest(s.trigger, spoofed, "live"),
      Error,
      REFUSED_PROFILE,
    );
    // ... and so does a signed body naming no profile at all
    const none = sign_(null, {
      "x-profile-id": PROFILE,
      "x-wise-profile-id": PROFILE,
      "x-profileid": PROFILE,
      "profile-id": PROFILE,
    });
    none.query = { profile_id: PROFILE, profileId: PROFILE, profile: PROFILE, id: PROFILE };
    await assertRejects(async () => await ingest(s.trigger, none, "live"), Error, REFUSED_PROFILE);
    // the reverse: the signed body carries the configured profile, header and query carry others
    // -> accepted, the body wins
    const real = sign_(PROFILE, { "x-profile-id": other, "x-wise-profile-id": other });
    real.query = { profile_id: other, profileId: other };
    assertEquals(evs(await ingest(s.trigger, real, "live")).length, 1);
    // a forged PARSED body does not matter either: the signed raw text decides
    const forged = sign_(other);
    forged.body = JSON.parse(s.body(PROFILE));
    await assertRejects(
      async () => await ingest(s.trigger, forged, "live"),
      Error,
      REFUSED_PROFILE,
    );
    const forgedBack = sign_(PROFILE);
    forgedBack.body = JSON.parse(s.body(other));
    assertEquals(evs(await ingest(s.trigger, forgedBack, "live")).length, 1);
  });

  test(`${s.name}: a test notification from another profile is refused; the profile errors echo neither id`, async () => {
    await assertRejects(
      async () => await ingest(s.trigger, sign_("999", { "x-test-notification": "true" }), "live"),
      Error,
      REFUSED_PROFILE,
    );
    // a verified test notification for the configured profile starts no run
    assertEquals(
      evs(await ingest(s.trigger, sign_("222", { "x-test-notification": "true" }), "live")),
      [],
    );
    const configured = "777123";
    const messages: string[] = [];
    for (const cfg of [configured, undefined]) {
      try {
        await ingest(s.trigger, sign_("222"), "live", cfg);
      } catch (err) {
        messages.push((err as Error).message);
      }
    }
    assertEquals(messages.length, 2);
    for (const m of messages) {
      assertEquals(m.includes(configured) || m.includes("222") || m.includes(SUB), false);
    }
  });

  test(`${s.name}: the signature is still checked first (unsigned or wrong profile + bad signature)`, async () => {
    await assertRejects(
      async () => await ingest(s.trigger, delivery(s.body("222"), {}), "live"),
      Error,
      "X-Signature-SHA256",
    );
    await assertRejects(
      async () =>
        await ingest(
          s.trigger,
          delivery(s.body("222"), { "x-signature-sha256": sign(s.body("999")) }),
          "live",
        ),
      Error,
      "signature does not match",
    );
  });
}

test("profile-state-changed: a profile event whose resource is not a profile is refused", async () => {
  const s = SHIPPED[3];
  const body = s.body("222").replace('"type": "profile"', '"type": "transfer"');
  assertEquals(body.includes('"transfer"'), true);
  await assertRejects(
    async () => await ingest(s.trigger, signed(body), "live"),
    Error,
    REFUSED_PROFILE,
  );
  const noType = s.body("222").replace(', "type": "profile"', "");
  assertEquals(noType.includes('profile"'), false);
  await assertRejects(
    async () => await ingest(s.trigger, signed(noType), "live"),
    Error,
    REFUSED_PROFILE,
  );
});

test("handleIngest: a signed delivery of ANOTHER event type is acknowledged with none, whatever it names", async () => {
  // a balance event on the transfer trigger's URL: no events, not a refusal (nothing is emitted)
  const balanceBody = SHIPPED[2].body("999");
  assertEquals(evs(await ingest(SHIPPED[0].trigger, signed(balanceBody), "live")), []);
});

test("no Wise trigger declares a subscriptionId param; every one declares a required string profileId", () => {
  assertEquals(webhookTriggers().length, 9);
  for (const t of webhookTriggers()) {
    assertEquals((t.params ?? []).some((x) => x.key === "subscriptionId"), false, t.key);
    const p = (t.params ?? []).find((x) => x.key === "profileId");
    assertEquals(p?.type, "string", t.key);
    assertEquals(p?.required, true, t.key);
    assertEquals(p?.label, "Wise profile ID", t.key);
    assertEquals((p?.hint ?? "").includes("List Profiles"), true, t.key);
    // the emitted event still carries the subscription id as data
    assertEquals((t.output ?? []).some((o) => o.key === "subscriptionId"), true, t.key);
  }
});
