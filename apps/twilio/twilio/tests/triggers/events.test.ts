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

test("call-status: a signature for another URL, a missing header and a non-POST throw", async () => {
  await assert.rejects(async () =>
    await ingest(callStatus, call(FORM, { "x-twilio-signature": formSig(URL_ + "x", FORM) }))
  );
  await assert.rejects(async () => await ingest(callStatus, call(FORM, {})));
  await assert.rejects(async () =>
    await ingest(callStatus, call(FORM, { "x-twilio-signature": formSig(URL_, FORM) }, "GET"))
  );
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

test("event streams: a signature over the re-serialised JSON, or a form-style signature, throws", async () => {
  const compact = JSON.stringify(JSON.parse(STREAM));
  await assert.rejects(async () =>
    await ingest(anyEvent, call(STREAM, { "x-twilio-signature": streamSig(URL_, compact) }))
  );
  await assert.rejects(async () =>
    await ingest(anyEvent, call(STREAM, { "x-twilio-signature": formSig(URL_, STREAM) }))
  );
});

test("event streams: a validly signed body that is not JSON is refused", async () => {
  const body = "not json";
  await assert.rejects(
    async () => await ingest(anyEvent, call(body, { "x-twilio-signature": streamSig(URL_, body) })),
    /not JSON/,
  );
});

// ------------------------------------------------------------------ every signed trigger

const MSG_IN =
  "MessageSid=SMsample-msg-sid&AccountSid=sample-account-sid&From=%2B15017122661&To=%2B15558675310&Body=Hello+there&NumMedia=0";
const MSG_STATUS =
  "MessageSid=SMsample-msg-sid&AccountSid=sample-account-sid&From=%2B15017122661&To=%2B15558675310&MessageStatus=delivered&SmsStatus=delivered";
const CALL_NONE = "CallSid=CAsample-call-sid&From=%2B15017122661";
/** One CloudEvent of the other type, so a trigger listening for the first one must stay silent. */
const STREAM_PREDICTED = `[
  {
    "specversion": "1.0",
    "type": "com.twilio.voice.insights.call-summary.predicted-complete",
    "source": "/v1/Voice/CAsample-call-sid/Summary",
    "id": "EZsample-event-2",
    "time": "2026-11-09T22:56:30.000Z",
    "data": { "call_sid": "CAsample-call-sid" }
  }
]`;
const COMPLETE = "com.twilio.voice.insights.call-summary.complete";

interface Row {
  key: string;
  /** form = SMS/voice webhook (sorted-params scheme); stream = Event Streams (bodySHA256 scheme). */
  scheme: "form" | "stream";
  /** The vendor event this trigger fires on, as the literal the test is pinned to. */
  event: string;
  /** A signed body of that event. */
  body: string;
  /** A signed body of a different event: acknowledged without a run. */
  other: string;
  /** The Any Event `events` param, when the trigger takes one. */
  listen?: string;
  /** Reads the event string back out of one emitted run. */
  seen: (run: Record<string, unknown>) => unknown;
}
const ROWS: Row[] = [
  {
    key: "incoming-message",
    scheme: "form",
    event: "Body=Hello there",
    body: MSG_IN,
    other: MSG_STATUS,
    seen: (r) => `Body=${r.body}`,
  },
  {
    key: "message-status",
    scheme: "form",
    event: "MessageStatus=delivered",
    body: MSG_STATUS,
    other: MSG_IN,
    seen: (r) => `MessageStatus=${r.messageStatus}`,
  },
  {
    key: "call-status",
    scheme: "form",
    event: "CallStatus=completed",
    body: FORM,
    other: CALL_NONE,
    seen: (r) => `CallStatus=${r.callStatus}`,
  },
  {
    key: "call-summary-complete",
    scheme: "stream",
    event: COMPLETE,
    body: STREAM,
    other: STREAM_PREDICTED,
    seen: (r) => r.type,
  },
  {
    key: "any-event",
    scheme: "stream",
    event: COMPLETE,
    body: STREAM,
    other: STREAM_PREDICTED,
    listen: COMPLETE,
    seen: (r) => r.type,
  },
];
const triggerByKey = (key: string): T => {
  const t = (app.triggers ?? []).find((x) => x.key === key);
  assert.ok(t, key);
  return t;
};
const flipAt = (s: string, i: number) =>
  s.slice(0, i) + (s[i] === "A" ? "B" : "A") + s.slice(i + 1);

test("the table names every signed trigger the app declares, once", () => {
  const declared = (app.triggers ?? []).filter((t) => typeof t.handleIngest === "function")
    .map((t) => t.key).sort();
  assert.deepEqual(ROWS.map((r) => r.key).sort(), declared);
});

for (const row of ROWS) {
  const trigger = triggerByKey(row.key);
  const sign = row.scheme === "form" ? formSig : streamSig;
  const run = (c: TriggerCall, token: string | undefined | null = TOKEN) =>
    ingest(trigger, c, token as string | undefined, row.listen);
  const signedBody = (body: string) => call(body, { "x-twilio-signature": sign(URL_, body) });

  test(`${row.key}: a signed ${row.event} delivery yields a run of that event; another event yields none`, async () => {
    const out = evs(await run(signedBody(row.body))) as Array<Record<string, unknown>>;
    assert.equal(out.length, 1);
    assert.equal(row.seen(out[0]), row.event);
    assert.deepEqual(evs(await run(signedBody(row.other))), []);
  });

  test(`${row.key}: a flipped byte of the SIGNATURE (first, middle, last-data and padding position) throws`, async () => {
    const good = sign(URL_, row.body);
    assert.equal(good.length, 28);
    for (const at of [0, 14, 26, 27]) {
      await assert.rejects(
        async () => await run(call(row.body, { "x-twilio-signature": flipAt(good, at) })),
        undefined,
        `pos ${at}`,
      );
    }
    // control: the unflipped signature is accepted
    assert.equal(evs(await run(call(row.body, { "x-twilio-signature": good }))).length, 1);
  });

  test(`${row.key}: a flipped byte in the body, or a re-serialised body, throws`, async () => {
    const good = sign(URL_, row.body);
    const tampered = row.scheme === "form"
      ? row.body.replace(/(%2B\d)(\d)/, "$1" + "9")
      : row.body.replace('"duration\\":5', '"duration\\":6');
    assert.notEqual(tampered, row.body);
    await assert.rejects(async () => await run(call(tampered, { "x-twilio-signature": good })));
    const reserialised = row.scheme === "form"
      ? new URLSearchParams(row.body).toString()
      : JSON.stringify(JSON.parse(row.body));
    if (reserialised !== row.body) {
      await assert.rejects(async () =>
        await run(call(row.body, { "x-twilio-signature": sign(URL_, reserialised) }))
      );
    }
  });

  test(`${row.key}: a missing header throws`, async () => {
    await assert.rejects(async () => await run(call(row.body, {})));
    await assert.rejects(async () => await run(call(row.body, { "x-twilio-signature": "" })));
  });

  test(`${row.key}: an absent rawBody throws (never falls back to the parsed body)`, async () => {
    const c = signedBody(row.body);
    delete c.rawBody;
    await assert.rejects(async () => await run(c), /raw body/);
  });

  test(`${row.key}: an unset or empty Auth Token refuses before any compare`, async () => {
    for (const token of [null, ""]) {
      await assert.rejects(async () => await run(call(row.body, {}), token), /secret/);
      await assert.rejects(
        async () => await run(call(row.body, { "x-twilio-signature": "" }), token),
        /secret/,
      );
    }
  });

  test(`${row.key}: a non-POST delivery throws`, async () => {
    for (const method of ["GET", "PUT"]) {
      await assert.rejects(
        async () =>
          await run(call(row.body, { "x-twilio-signature": sign(URL_, row.body) }, method)),
        undefined,
        method,
      );
    }
  });

  test(`${row.key}: a signature for another URL throws`, async () => {
    await assert.rejects(async () =>
      await run(call(row.body, { "x-twilio-signature": sign(URL_ + "x", row.body) }))
    );
  });
}
