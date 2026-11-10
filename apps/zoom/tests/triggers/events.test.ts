import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import meetingStarted from "../../triggers/meeting-started.ts";
import meetingUpdated from "../../triggers/meeting-updated.ts";
import recordingCompleted from "../../triggers/recording-completed.ts";
import anyEvent from "../../triggers/any-event.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_z";
const SECRET = "test-secret-token";
// deno-lint-ignore no-explicit-any
type T = any;
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** Non-canonical JSON: indentation Zoom's compact JSON never has, so re-serialising differs. */
const BODY = `{
  "event": "meeting.started",
  "event_ts": 1626230691572,
  "payload": {
    "account_id": "sample-account-id",
    "object": { "id": "1234567890", "uuid": "sample-meeting-uuid", "topic": "Weekly sync" }
  }
}`;

/** The expected signature, computed with node:crypto: v0=hex(HMAC-SHA256(secret, v0:ts:body)). */
function sig(body: string, ts: number | string, secret = SECRET): string {
  return "v0=" + createHmac("sha256", secret).update(`v0:${ts}:${body}`).digest("hex");
}
const nowSec = () => Math.floor(Date.now() / 1000);

function delivery(
  rawBody: string | undefined,
  headers: Record<string, string>,
  method = "POST",
): TriggerCall {
  let body: unknown = rawBody;
  try {
    body = rawBody === undefined ? undefined : JSON.parse(rawBody);
  } catch { /* keep text */ }
  const call: TriggerCall = { method, path: "/triggers/webhooks/sub_z", query: {}, headers, body };
  if (rawBody !== undefined) call.rawBody = rawBody;
  return call;
}
function signed(body = BODY, ts: number = nowSec()): TriggerCall {
  return delivery(body, { "x-zm-signature": sig(body, ts), "x-zm-request-timestamp": String(ts) });
}
function ingest(
  trigger: T,
  call: TriggerCall,
  secretToken: string | null = SECRET,
  events?: string,
) {
  return trigger.handleIngest(
    {
      raw: call,
      params: {
        ...(secretToken === null ? {} : { secretToken }),
        ...(events === undefined ? {} : { events }),
      },
      state: { callbackUrl: CALLBACK },
      subscriptionId: "sub_z",
    },
    mockCtx().ctx,
  );
}
const flip = (s: string) => s.slice(0, -1) + (s.endsWith("0") ? "1" : "0");

test("fixture: the body is not canonical JSON, so re-serialising would break the signature", () => {
  assertEquals(JSON.stringify(JSON.parse(BODY)) !== BODY, true);
});

test("the app declares 20 triggers: 16 webhook and 4 poll, each with output and a sample", () => {
  const triggers = app.triggers ?? [];
  assertEquals(triggers.length, 20);
  assertEquals(triggers.filter((t) => typeof t.handleIngest === "function").length, 16);
  assertEquals(triggers.filter((t) => typeof t.poll === "function").length, 4);
  assertEquals(new Set(triggers.map((t) => t.key)).size, 20);
  for (const t of triggers) {
    assertEquals((t.output?.length ?? 0) > 0, true, t.key);
    assertEquals(t.sample !== undefined, true, t.key);
    if (t.handleIngest) {
      assertEquals(typeof t.poll, "undefined", t.key);
      assertEquals(t.params?.find((p) => p.key === "secretToken")?.type, "secret", t.key);
    }
  }
});

test("onSubscribe returns the callback URL to paste, makes no Zoom call; onUnsubscribe is a no-op", async () => {
  const { ctx, calls } = mockCtx();
  const state = await (meetingStarted as T).onSubscribe(
    { params: {}, callbackUrl: CALLBACK, subscriptionId: "s" },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await (meetingStarted as T).onUnsubscribe({ params: {}, state, subscriptionId: "s" }, ctx);
  assertEquals(calls.length, 0);
});

test("handleIngest: a valid signature over the exact bytes yields the normalized event", async () => {
  const out = evs(await ingest(meetingStarted, signed()));
  assertEquals(out, [{
    event: "meeting.started",
    eventTs: 1626230691572,
    accountId: "sample-account-id",
    object: { id: "1234567890", uuid: "sample-meeting-uuid", topic: "Weekly sync" },
    oldObject: null,
  }]);
});

test("handleIngest: meeting.updated carries old_object as oldObject", async () => {
  const body =
    `{ "event": "meeting.updated", "event_ts": 5, "payload": { "account_id": "a", "object": { "id": 1, "topic": "New" }, "old_object": { "id": 1, "topic": "Old" } } }`;
  const out = evs(await ingest(meetingUpdated, signed(body)));
  assertEquals(out, [{
    event: "meeting.updated",
    eventTs: 5,
    accountId: "a",
    object: { id: 1, topic: "New" },
    oldObject: { id: 1, topic: "Old" },
  }]);
});

test("handleIngest: a flipped byte in the SIGNATURE throws", async () => {
  const ts = nowSec();
  const call = delivery(BODY, {
    "x-zm-signature": flip(sig(BODY, ts)),
    "x-zm-request-timestamp": String(ts),
  });
  await assertRejects(async () => await ingest(meetingStarted, call));
});

test("handleIngest: a flipped byte in the body throws", async () => {
  const ts = nowSec();
  const call = delivery(BODY.replace("Weekly", "Weakly"), {
    "x-zm-signature": sig(BODY, ts),
    "x-zm-request-timestamp": String(ts),
  });
  await assertRejects(async () => await ingest(meetingStarted, call));
});

test("handleIngest: a signature made over re-serialised JSON, or with another timestamp, is refused", async () => {
  const ts = nowSec();
  const compact = JSON.stringify(JSON.parse(BODY));
  await assertRejects(async () =>
    await ingest(
      meetingStarted,
      delivery(BODY, { "x-zm-signature": sig(compact, ts), "x-zm-request-timestamp": String(ts) }),
    )
  );
  await assertRejects(async () =>
    await ingest(
      meetingStarted,
      delivery(BODY, { "x-zm-signature": sig(BODY, ts), "x-zm-request-timestamp": String(ts + 1) }),
    )
  );
});

test("handleIngest: a missing signature or timestamp header throws", async () => {
  const ts = nowSec();
  await assertRejects(async () => await ingest(meetingStarted, delivery(BODY, {})));
  await assertRejects(async () =>
    await ingest(meetingStarted, delivery(BODY, { "x-zm-request-timestamp": String(ts) }))
  );
  await assertRejects(async () =>
    await ingest(meetingStarted, delivery(BODY, { "x-zm-signature": sig(BODY, ts) }))
  );
});

test("handleIngest: an absent rawBody throws (never falls back to the parsed body)", async () => {
  const call = signed();
  delete call.rawBody;
  await assertRejects(async () => await ingest(meetingStarted, call), Error, "raw body");
});

test("handleIngest: a stale or future timestamp throws even with a correct signature", async () => {
  const now = nowSec();
  for (const ts of [now - 305, now + 305]) {
    await assertRejects(
      async () => await ingest(meetingStarted, signed(BODY, ts)),
      Error,
      "tolerance",
    );
  }
  assertEquals(evs(await ingest(meetingStarted, signed(BODY, now - 200))).length, 1);
});

test("handleIngest: an unset or empty Secret Token refuses before any compare", async () => {
  for (const token of [null, ""]) {
    await assertRejects(
      async () => await ingest(meetingStarted, delivery(BODY, {}), token),
      Error,
      "secret",
    );
    await assertRejects(
      async () =>
        await ingest(
          meetingStarted,
          delivery(BODY, { "x-zm-signature": "v0=", "x-zm-request-timestamp": "1" }),
          token,
        ),
      Error,
      "secret",
    );
  }
});

test("handleIngest: a non-POST delivery throws", async () => {
  const ts = nowSec();
  const call = delivery(
    BODY,
    { "x-zm-signature": sig(BODY, ts), "x-zm-request-timestamp": String(ts) },
    "PUT",
  );
  await assertRejects(async () => await ingest(meetingStarted, call));
});

test("handleIngest: a named trigger ignores other events; it does not even need its own body shape", async () => {
  const other = BODY.replace("meeting.started", "meeting.ended");
  assertEquals(evs(await ingest(meetingStarted, signed(other))), []);
});

test("recording-completed drops the 24-hour download token", async () => {
  const body =
    `{ "event": "recording.completed", "event_ts": 7, "download_token": "sample-download-token", "payload": { "account_id": "a", "object": { "id": 1, "recording_files": [] } } }`;
  const out = evs(await ingest(recordingCompleted, signed(body)));
  assertEquals(out, [{
    event: "recording.completed",
    eventTs: 7,
    accountId: "a",
    object: { id: 1, recording_files: [] },
    oldObject: null,
  }]);
  assertEquals(JSON.stringify(out).includes("sample-download-token"), false);
});

test("any-event: the events filter keeps only the listed events; empty keeps all", async () => {
  const ended = BODY.replace("meeting.started", "meeting.ended");
  const list = " meeting.ended , recording.completed ";
  assertEquals(evs(await ingest(anyEvent, signed(BODY), SECRET, list)), []);
  assertEquals(evs(await ingest(anyEvent, signed(ended), SECRET, list)).length, 1);
  assertEquals(evs(await ingest(anyEvent, signed(BODY), SECRET, "")).length, 1);
  assertEquals(evs(await ingest(anyEvent, signed(BODY))).length, 1);
});

// ------------------------------------------------------------------ URL validation

const CHALLENGE =
  `{ "payload": { "plainToken": "qgg8vlvZRS6UYooatFL8Aw" }, "event_ts": 1654503849680, "event": "endpoint.url_validation" }`;

test("url validation: a signed challenge is answered with the plain and the HMAC'd token, no event", async () => {
  const r = await ingest(meetingStarted, signed(CHALLENGE)) as {
    events: unknown[];
    response: { status?: number; headers?: Record<string, string>; body?: string };
  };
  assertEquals(r.events, []);
  assertEquals(r.response.status, 200);
  assertEquals(r.response.headers, { "content-type": "application/json" });
  const expected = createHmac("sha256", SECRET).update("qgg8vlvZRS6UYooatFL8Aw").digest("hex");
  assertEquals(JSON.parse(r.response.body!), {
    plainToken: "qgg8vlvZRS6UYooatFL8Aw",
    encryptedToken: expected,
  });
});

test("url validation: an unsigned, mis-signed or stale challenge is refused (no HMAC oracle)", async () => {
  await assertRejects(async () => await ingest(meetingStarted, delivery(CHALLENGE, {})));
  const ts = nowSec();
  await assertRejects(async () =>
    await ingest(
      meetingStarted,
      delivery(CHALLENGE, {
        "x-zm-signature": flip(sig(CHALLENGE, ts)),
        "x-zm-request-timestamp": String(ts),
      }),
    )
  );
  await assertRejects(
    async () => await ingest(meetingStarted, signed(CHALLENGE, nowSec() - 400)),
    Error,
    "tolerance",
  );
});

test("url validation: a plainToken that is not a plain token is refused", async () => {
  const forged =
    `{ "payload": { "plainToken": "v0:1:{\\"event\\":\\"x\\"}" }, "event": "endpoint.url_validation" }`;
  await assertRejects(
    async () => await ingest(meetingStarted, signed(forged)),
    Error,
    "plainToken",
  );
  const numeric = `{ "payload": { "plainToken": 5 }, "event": "endpoint.url_validation" }`;
  await assertRejects(
    async () => await ingest(meetingStarted, signed(numeric)),
    Error,
    "plainToken",
  );
});

test("url validation with an unset Secret Token is refused before anything is hashed", async () => {
  await assertRejects(
    async () => await ingest(anyEvent, signed(CHALLENGE), ""),
    Error,
    "secret",
  );
});
