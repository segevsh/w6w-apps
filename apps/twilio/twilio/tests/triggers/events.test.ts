import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import callStatus from "../../triggers/call-status.ts";
import callSummary from "../../triggers/call-summary-complete.ts";
import anyEvent from "../../triggers/any-event.ts";

const URL_ = "https://api.example.test/triggers/webhooks/sub_9";
const TOKEN = "test-auth-token";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// ---- call status callback: a form body whose parameters are NOT in sorted order, with escapes.
const FORM =
  "To=%2B15558675310&CallStatus=completed&CallSid=CAsample-call-sid&From=%2B15017122661&Direction=outbound-api&CallDuration=42&AccountSid=sample-account-sid&Note=a+b%21";

/** Expected form signature, computed here with node:crypto (independent of the app). */
function formSig(url: string, body: string, token = TOKEN): string {
  const p = new URLSearchParams(body);
  const s = [...p.keys()].sort().map((k) => k + p.get(k)).join("");
  return createHmac("sha1", token).update(url + s).digest("base64");
}

// ---- Event Streams: a JSON array of CloudEvents with whitespace Twilio's compact JSON never has.
const STREAM = `[
  {
    "specversion": "1.0",
    "type": "com.twilio.voice.insights.call-summary.complete",
    "source": "/v1/Voice/CAsample-call-sid/Summary",
    "id": "EZsample-event-1",
    "dataschema": "https://events-schemas.twilio.com/VoiceInsights.CallSummary/1",
    "datacontenttype": "application/json",
    "time": "2026-11-09T22:56:33.000Z",
    "data": "{\\"call_sid\\":\\"CAsample-call-sid\\",\\"duration\\":5}"
  },
  {
    "specversion": "1.0",
    "type": "com.twilio.voice.insights.call-summary.predicted-complete",
    "source": "/v1/Voice/CAsample-call-sid/Summary",
    "id": "EZsample-event-2",
    "time": "2026-11-09T22:56:30.000Z",
    "data": { "call_sid": "CAsample-call-sid" }
  }
]`;

/** Expected Event Streams signature: the URL with ?bodySHA256=<sha256 hex of the raw body>. */
function streamSig(url: string, body: string, token = TOKEN): string {
  const digest = createHash("sha256").update(body).digest("hex");
  return createHmac("sha1", token).update(`${url}?bodySHA256=${digest}`).digest("base64");
}

function call(
  body: string | undefined,
  headers: Record<string, string>,
  method = "POST",
): TriggerCall {
  let parsed: unknown = null;
  try {
    parsed = body === undefined ? null : JSON.parse(body);
  } catch {
    parsed = body === undefined ? null : Object.fromEntries(new URLSearchParams(body));
  }
  return {
    method,
    path: "/triggers/webhooks/sub_9",
    query: {},
    headers,
    body: parsed,
    ...(body === undefined ? {} : { rawBody: body }),
  };
}

// deno-lint-ignore no-explicit-any
type T = any;
function ingest(
  trigger: T,
  c: TriggerCall,
  authToken: string | undefined = TOKEN,
  events?: string,
) {
  return trigger.handleIngest(
    {
      raw: c,
      params: { authToken, ...(events === undefined ? {} : { events }) },
      state: { callbackUrl: URL_ },
      subscriptionId: "sub_9",
    },
    mockCtx().ctx,
  );
}

const flip = (sig: string) => (sig[0] === "A" ? "B" : "A") + sig.slice(1);
const signedForm = (body = FORM) => call(body, { "x-twilio-signature": formSig(URL_, body) });
const signedStream = (body = STREAM) => call(body, { "x-twilio-signature": streamSig(URL_, body) });

test("the app declares five webhook triggers, each with output and a sample", () => {
  const triggers = app.triggers ?? [];
  assert.deepEqual(triggers.map((t) => t.key), [
    "incoming-message",
    "message-status",
    "call-status",
    "call-summary-complete",
    "any-event",
  ]);
  for (const t of triggers) {
    assert.equal(typeof t.handleIngest, "function", t.key);
    assert.equal(typeof t.poll, "undefined", t.key);
    assert.ok((t.output?.length ?? 0) > 0, t.key);
    assert.ok(t.sample !== undefined, t.key);
  }
});

test("fixtures: neither body is canonical, so re-serialising would break the signature", () => {
  assert.notEqual(JSON.stringify(JSON.parse(STREAM)), STREAM);
  const keys = [...new URLSearchParams(FORM).keys()];
  assert.notDeepEqual(keys, [...keys].sort()); // Twilio signs the sorted order, not the wire order
});

test("onSubscribe returns the callback URL it must be pasted as, and calls nothing", async () => {
  for (const t of [callStatus, callSummary, anyEvent] as T[]) {
    const { ctx, calls } = mockCtx();
    const state = await t.onSubscribe({ params: {}, callbackUrl: URL_, subscriptionId: "s" }, ctx);
    assert.deepEqual(state, { callbackUrl: URL_ });
    assert.equal(calls.length, 0);
  }
});

// ------------------------------------------------------------------ call-status

test("call-status: a valid signature yields the normalized call event", async () => {
  const out = evs(await ingest(callStatus, signedForm()));
  assert.deepEqual(out, [{
    callSid: "CAsample-call-sid",
    accountSid: "sample-account-sid",
    from: "+15017122661",
    to: "+15558675310",
    callStatus: "completed",
    direction: "outbound-api",
    callDuration: 42,
    parentCallSid: null,
    params: {
      To: "+15558675310",
      CallStatus: "completed",
      CallSid: "CAsample-call-sid",
      From: "+15017122661",
      Direction: "outbound-api",
      CallDuration: "42",
      AccountSid: "sample-account-sid",
      Note: "a b!",
    },
  }]);
});

test("call-status: a form with no CallStatus is acknowledged without an event", async () => {
  const body = "CallSid=CAsample-call-sid&From=%2B15017122661";
  assert.deepEqual(evs(await ingest(callStatus, signedForm(body))), []);
});

test("call-status: a flipped byte in the SIGNATURE throws", async () => {
  const sig = formSig(URL_, FORM);
  await assert.rejects(async () =>
    await ingest(callStatus, call(FORM, { "x-twilio-signature": flip(sig) }))
  );
});

test("call-status: a flipped byte in the body throws", async () => {
  const sig = formSig(URL_, FORM);
  await assert.rejects(async () =>
    await ingest(
      callStatus,
      call(FORM.replace("CallDuration=42", "CallDuration=43"), { "x-twilio-signature": sig }),
    )
  );
});

test("call-status: a signature for another URL, a missing header and a non-POST throw", async () => {
  await assert.rejects(async () =>
    await ingest(callStatus, call(FORM, { "x-twilio-signature": formSig(URL_ + "x", FORM) }))
  );
  await assert.rejects(async () => await ingest(callStatus, call(FORM, {})));
  await assert.rejects(async () =>
    await ingest(callStatus, call(FORM, { "x-twilio-signature": formSig(URL_, FORM) }, "GET"))
  );
});

test("call-status: an absent rawBody throws (never falls back to the parsed body)", async () => {
  const c = signedForm();
  delete c.rawBody;
  await assert.rejects(async () => await ingest(callStatus, c), /raw body/);
});

test("call-status: an unset or empty Auth Token refuses before any compare", async () => {
  for (const token of [null, ""]) {
    await assert.rejects(async () => await ingest(callStatus, call(FORM, {}), token), /secret/);
    await assert.rejects(
      async () => await ingest(callStatus, call(FORM, { "x-twilio-signature": "" }), token),
      /secret/,
    );
  }
});

// ------------------------------------------------------------------ Event Streams

test("call-summary-complete: a valid signature emits only its own type, with data parsed", async () => {
  const out = evs(await ingest(callSummary, signedStream()));
  assert.deepEqual(out, [{
    id: "EZsample-event-1",
    type: "com.twilio.voice.insights.call-summary.complete",
    source: "/v1/Voice/CAsample-call-sid/Summary",
    time: "2026-11-09T22:56:33.000Z",
    dataSchema: "https://events-schemas.twilio.com/VoiceInsights.CallSummary/1",
    data: { call_sid: "CAsample-call-sid", duration: 5 },
  }]);
});

test("any-event: every event in the array is emitted when no filter is set", async () => {
  const out = evs(await ingest(anyEvent, signedStream())) as Array<{ id: string }>;
  assert.deepEqual(out.map((e) => e.id), ["EZsample-event-1", "EZsample-event-2"]);
});

test("any-event: the events filter keeps only the listed types", async () => {
  const only = "com.twilio.voice.insights.call-summary.predicted-complete";
  const out = evs(await ingest(anyEvent, signedStream(), TOKEN, ` ${only} , other.type`));
  assert.deepEqual((out as Array<{ id: string }>).map((e) => e.id), ["EZsample-event-2"]);
  assert.deepEqual(evs(await ingest(anyEvent, signedStream(), TOKEN, "no.such.type")), []);
});

test("event streams: a flipped byte in the SIGNATURE throws", async () => {
  const sig = streamSig(URL_, STREAM);
  for (const t of [callSummary, anyEvent]) {
    await assert.rejects(async () =>
      await ingest(t, call(STREAM, { "x-twilio-signature": flip(sig) }))
    );
  }
});

test("event streams: a flipped byte in the body throws (the body hash is part of the signed URL)", async () => {
  const sig = streamSig(URL_, STREAM);
  for (const t of [callSummary, anyEvent]) {
    await assert.rejects(async () =>
      await ingest(
        t,
        call(STREAM.replace('"duration\\":5', '"duration\\":6'), {
          "x-twilio-signature": sig,
        }),
      )
    );
  }
});

test("event streams: a signature over the re-serialised JSON, or a form-style signature, throws", async () => {
  const compact = JSON.stringify(JSON.parse(STREAM));
  await assert.rejects(async () =>
    await ingest(anyEvent, call(STREAM, { "x-twilio-signature": streamSig(URL_, compact) }))
  );
  await assert.rejects(async () =>
    await ingest(anyEvent, call(STREAM, { "x-twilio-signature": formSig(URL_, STREAM) }))
  );
});

test("event streams: a missing header, an absent rawBody and a non-POST throw", async () => {
  await assert.rejects(async () => await ingest(anyEvent, call(STREAM, {})));
  const c = signedStream();
  delete c.rawBody;
  await assert.rejects(async () => await ingest(anyEvent, c), /raw body/);
  await assert.rejects(async () =>
    await ingest(anyEvent, call(STREAM, { "x-twilio-signature": streamSig(URL_, STREAM) }, "GET"))
  );
});

test("event streams: an unset or empty Auth Token refuses before any compare", async () => {
  for (const t of [callSummary, anyEvent]) {
    for (const token of [null, ""]) {
      await assert.rejects(async () => await ingest(t, call(STREAM, {}), token), /secret/);
    }
  }
});

test("event streams: a validly signed body that is not JSON is refused", async () => {
  const body = "not json";
  await assert.rejects(
    async () => await ingest(anyEvent, call(body, { "x-twilio-signature": streamSig(URL_, body) })),
    /not JSON/,
  );
});
