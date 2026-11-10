import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "account-secret-token-for-tests-0123";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const nowSec = () => Math.floor(Date.now() / 1000);

// Every trigger key → the Clearout event type it keeps (null = Any Event).
const TYPE_OF: Record<string, string | null> = {
  "email-verifier-bulk-completed": "email_verifier.bulk.completed",
  "email-finder-bulk-completed": "email_finder.bulk.completed",
  "form-guard-email-validated": "form_guard.email_validation.completed",
  "email-verifier-instant-completed": "email_verifier.instant.completed",
  "email-finder-instant-completed": "email_finder.instant.completed",
  "form-guard-phone-validated": "form_guard.phone_validation.completed",
  "form-guard-name-validated": "form_guard.name_validation.completed",
  "any-event": null,
};

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const bodyFor = (type: string) =>
  `{ "event_id" : "69f0621ac1b2d86092997d99",
  "event_type":"${type}", "event_mode": "live", "event_created_on":"2026-11-10T10:43:48.077Z",
  "payload": { "status":"success",  "data": {"result":{"status":"valid"},"page_url":"https://example.com"} } }`;

/** Independent of the app: `t=<ts>,v1=<hex HMAC-SHA256 of "<ts>.<raw body>">`. */
const sign = (b: string, ts = nowSec(), secret = SECRET) =>
  `t=${ts},v1=${createHmac("sha256", secret).update(`${ts}.${b}`).digest("hex")}`;

const trigger = (key: string) => {
  const t = app.triggers.find((x) => x.key === key);
  assert(t !== undefined, `trigger ${key} is declared`);
  return t!;
};

const call = (
  b: string,
  signature: string,
  over: Record<string, unknown> = {},
  params: Record<string, unknown> = { signingSecret: SECRET },
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "x-co-webhook-signature": signature } as Record<string, string>,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params,
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const ingest = (key: string, input: ReturnType<typeof call>) =>
  trigger(key).handleIngest!(input as never, mockCtx().ctx);

test("the app declares every Clearout webhook event with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), Object.keys(TYPE_OF));
  for (const t of app.triggers) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
  }
  assertEquals(trigger("any-event").params!.map((p) => p.key), ["signingSecret", "events"]);
  assertEquals(trigger("email-verifier-instant-completed").params!.map((p) => p.key), [
    "signingSecret",
  ]);
});

for (const [key, type] of Object.entries(TYPE_OF)) {
  const eventType = type ?? "form_guard.name_validation.completed";
  const BODY = bodyFor(eventType);

  test(`${key}: fixture has non-canonical whitespace`, () => {
    assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
  });

  test(`${key}: valid signature → one event of the right type`, async () => {
    const out = evs(await ingest(key, call(BODY, sign(BODY)))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].eventType, eventType);
    assertEquals(out[0].eventId, "69f0621ac1b2d86092997d99");
    assertEquals(out[0].status, "success");
  });

  test(`${key}: flipping a byte of the SIGNATURE itself (start, middle, end) is refused`, async () => {
    const good = sign(BODY);
    const at = good.indexOf("v1=") + 3;
    const hexLen = good.length - at;
    for (const i of [at, at + Math.floor(hexLen / 2), good.length - 1]) {
      const flipped = good.slice(0, i) + (good[i] === "0" ? "1" : "0") + good.slice(i + 1);
      assert(flipped !== good);
      await assertRejects(() => ingest(key, call(BODY, flipped)), Error, "signature");
    }
    // The timestamp is signed too: moving it by one second breaks the match.
    const t = Number(good.slice(2, good.indexOf(",")));
    await assertRejects(
      () => ingest(key, call(BODY, good.replace(`t=${t}`, `t=${t + 1}`))),
      Error,
      "signature",
    );
  });

  test(`${key}: a flipped byte in the body is refused`, async () => {
    const forged = BODY.replace("2026-11-10", "2026-11-11");
    await assertRejects(() => ingest(key, call(forged, sign(BODY))), Error, "signature");
  });

  test(`${key}: header missing, empty or malformed → refused`, async () => {
    await assertRejects(
      () => ingest(key, call(BODY, "", { headers: {} })),
      Error,
      "x-co-webhook-signature",
    );
    for (const h of ["", "v1=abc", "t=123", "garbage"]) {
      await assertRejects(() => ingest(key, call(BODY, h)), Error);
    }
  });

  test(`${key}: rawBody absent → refused even with a correct signature`, async () => {
    const c = call(BODY, sign(BODY));
    delete (c.raw as { rawBody?: string }).rawBody;
    await assertRejects(() => ingest(key, c), Error, "raw body");
  });

  test(`${key}: unset or empty secret → refused before any compare`, async () => {
    for (const secret of [undefined, ""]) {
      for (const sig of ["", sign(BODY)]) {
        await assertRejects(
          () => ingest(key, call(BODY, sig, {}, { signingSecret: secret })),
          Error,
          "secret",
        );
      }
    }
  });

  test(`${key}: a stale or future timestamp is refused even when correctly signed`, async () => {
    for (const delta of [-600, 600]) {
      await assertRejects(
        () => ingest(key, call(BODY, sign(BODY, nowSec() + delta))),
        Error,
        "timestamp",
      );
    }
  });
}

test("each named trigger keeps only its own event type", async () => {
  for (const [key, type] of Object.entries(TYPE_OF)) {
    if (type === null) continue;
    for (const [otherKey, otherType] of Object.entries(TYPE_OF)) {
      if (otherType === null || otherKey === key) continue;
      const b = bodyFor(otherType);
      assertEquals(evs(await ingest(key, call(b, sign(b)))), [], `${key} ignores ${otherType}`);
    }
  }
});

test("any-event: empty Events keeps every event type; a list keeps only those named", async () => {
  const types = Object.values(TYPE_OF).filter((t): t is string => t !== null);
  for (const type of types) {
    const b = bodyFor(type);
    assertEquals(evs(await ingest("any-event", call(b, sign(b)))).length, 1, type);
    const blank = call(b, sign(b), {}, { signingSecret: SECRET, events: "  " });
    assertEquals(evs(await ingest("any-event", blank)).length, 1, `${type} (blank filter)`);
  }
  const events = " form_guard.phone_validation.completed , email_verifier.instant.completed ";
  for (const type of types) {
    const b = bodyFor(type);
    const out = evs(
      await ingest("any-event", call(b, sign(b), {}, { signingSecret: SECRET, events })),
    );
    const wanted = type === "form_guard.phone_validation.completed" ||
      type === "email_verifier.instant.completed";
    assertEquals(out.length, wanted ? 1 : 0, type);
  }
});

test("any-event: the filter runs only after the signature verified", async () => {
  const b = bodyFor("email_finder.bulk.completed");
  await assertRejects(
    () =>
      ingest(
        "any-event",
        call(b, "t=1,v1=00", {}, {
          signingSecret: SECRET,
          events: "form_guard.name_validation.completed",
        }),
      ),
    Error,
  );
});

test("errors never contain the secret, the signature or the header value", async () => {
  const b = bodyFor("email_verifier.bulk.completed");
  const sig = sign(b, nowSec(), "another-secret-value-xxxxxxxx");
  try {
    await ingest("any-event", call(b, sig));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(sig) && !m.includes(sig.split("v1=")[1]));
  }
});

test("a non-POST call is refused", async () => {
  const b = bodyFor("email_verifier.bulk.completed");
  await assertRejects(
    () => ingest("any-event", call(b, sign(b), { method: "GET" })),
    Error,
    "POST",
  );
});

test("onSubscribe makes no vendor call and returns the callback URL; onUnsubscribe is a no-op", async () => {
  for (const t of app.triggers) {
    const { ctx, calls } = mockCtx();
    const state = await t.onSubscribe!(
      { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
      ctx,
    );
    assertEquals(state, { callbackUrl: CALLBACK });
    await t.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
    assertEquals(calls.length, 0);
  }
});
