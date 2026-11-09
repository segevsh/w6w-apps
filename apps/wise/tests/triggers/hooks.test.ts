import { test } from "node:test";
import { createSign, generateKeyPairSync } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import transferStateChanged from "../../triggers/transfer-state-changed.ts";
import balanceUpdated from "../../triggers/balance-updated.ts";
import {
  type PublicKeys,
  verifyRsaSha256,
  webhookTrigger,
  WISE_LIVE_PUBLIC_KEY,
  WISE_SANDBOX_PUBLIC_KEY,
} from "../../lib/triggers.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const HOST = "https://api.example.test";

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
) {
  return trigger.handleIngest!(
    { raw: call, params: { environment }, state: { callbackUrl: CALLBACK }, subscriptionId: "s" },
    mockCtx().ctx,
  );
}

// ---- Wise-signed vector, through the shipped trigger and Wise's real pinned key -----------------

test("handleIngest: a delivery signed by Wise verifies against the pinned sandbox key", async () => {
  const call = delivery(WISE_BODY, {
    "X-Signature-SHA256": WISE_SIGNATURE,
    "X-Delivery-Id": "5a1d3c70-2b8e-4a6f-9f0e-7c2d1e4b8a93",
  });
  assertEquals(evs(await ingest(transferStateChanged, call, "sandbox")), [{
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
    async () => await ingest(transferStateChanged, call, "sandbox"),
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
  sampleData: {},
}, KEYS);
const balances = webhookTrigger({
  key: "b",
  title: "b",
  description: "b",
  eventType: "balances#update",
  sampleData: {},
}, KEYS);

/** A body with whitespace Wise's compact JSON never has, so re-serialising differs. */
const BODY = `{
  "data": { "resource": { "id": 111, "type": "transfer" }, "current_state": "processing" },
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
    data: { resource: { id: 111, type: "transfer" }, current_state: "processing" },
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

test("the app declares four webhook triggers, each with output and a sample", () => {
  const triggers = app.triggers ?? [];
  assertEquals(triggers.length, 4);
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
  assertEquals(evs(await ingest(balanceUpdated, call, "sandbox")), []);
});
