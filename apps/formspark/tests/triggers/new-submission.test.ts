import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import trigger from "../../triggers/new-submission.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "signing-secret-for-tests-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const NOW = Math.floor(Date.now() / 1000);

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "email" : "kramer@nineties.sitcom",
  "message":  "Who turns down a Junior Mint?" }`;

const sign = (ts: number | string, b: string, secret = SECRET) =>
  "v1=" + createHmac("sha256", secret).update(`${ts}.${b}`).digest("hex");

const headers = (b: string, ts: number | string = NOW, sig = sign(ts, b)) => ({
  "formspark-signature": sig,
  "formspark-timestamp": String(ts),
  "formspark-submission-id": "sub_abc123",
});

const call = (
  b: string,
  over: Record<string, unknown> = {},
  secret: string | undefined | null = SECRET,
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: headers(b) as Record<string, string>,
    body: (() => {
      try {
        return JSON.parse(b);
      } catch {
        return b;
      }
    })(),
    rawBody: b,
    ...over,
  },
  params: { signingSecret: secret === null ? undefined : secret },
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const ingest = (input: ReturnType<typeof call>) => trigger.handleIngest!(input, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares the webhook trigger with output, sample and a secret param", () => {
  assertEquals(app.triggers.map((t) => t.key), ["new-submission"]);
  assert(trigger.output!.length > 0);
  assert(trigger.sample !== undefined);
  assertEquals(trigger.poll, undefined);
  assertEquals(trigger.params!.map((p) => [p.key, p.type]), [["signingSecret", "secret"]]);
});

test("valid signature → one event with the id, send time and fields", async () => {
  const out = evs(await ingest(call(BODY))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].submissionId, "sub_abc123");
  assertEquals(out[0].sentAt, new Date(NOW * 1000).toISOString());
  assertEquals(out[0].fields, {
    email: "kramer@nineties.sitcom",
    message: "Who turns down a Junior Mint?",
  });
});

test("one flipped byte in the body → refused", async () => {
  await assertRejects(
    () => ingest(call(BODY, { rawBody: BODY.replace("Junior", "Senior") })),
    Error,
    "signature",
  );
});

test("signature made with another secret → refused", async () => {
  const c = call(BODY, {
    headers: headers(BODY, NOW, sign(NOW, BODY, "another-secret-value-xxxxxxxx")),
  });
  await assertRejects(() => ingest(c), Error, "signature");
});

test("a signature over a different timestamp than the header carries → refused", async () => {
  const c = call(BODY, { headers: headers(BODY, NOW, sign(NOW - 1, BODY)) });
  await assertRejects(() => ingest(c), Error, "signature");
});

test("signature without the v1= prefix → refused", async () => {
  const bare = sign(NOW, BODY).slice(3);
  await assertRejects(
    () => ingest(call(BODY, { headers: headers(BODY, NOW, bare) })),
    Error,
    "signature",
  );
});

test("signature or timestamp header missing → refused", async () => {
  await assertRejects(() => ingest(call(BODY, { headers: {} })), Error, "Formspark-Signature");
  await assertRejects(
    () => ingest(call(BODY, { headers: { "formspark-signature": sign(NOW, BODY) } })),
    Error,
    "Formspark-Timestamp",
  );
});

test("rawBody absent → refused, even with a correct signature", async () => {
  const c = call(BODY);
  delete (c.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(c), Error, "raw body");
});

test("unset or empty secret + absent or empty header → refused", async () => {
  for (const secret of [null, ""]) {
    for (const h of [{}, { "formspark-signature": "" }]) {
      await assertRejects(() => ingest(call(BODY, { headers: h }, secret)), Error, "secret");
    }
  }
});

test("a stale or future timestamp (even correctly signed) → refused; one inside the window passes", async () => {
  for (const ts of [NOW - 301, NOW + 301]) {
    await assertRejects(
      () => ingest(call(BODY, { headers: headers(BODY, ts) })),
      Error,
      "window",
    );
  }
  assertEquals(evs(await ingest(call(BODY, { headers: headers(BODY, NOW - 120) }))).length, 1);
});

test("errors never contain the secret, the signature or the header value", async () => {
  const sig = sign(NOW, BODY, "another-secret-value-xxxxxxxx");
  try {
    await ingest(call(BODY, { headers: headers(BODY, NOW, sig) }));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(sig) && !m.includes(sig.slice(3)));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(() => ingest(call(BODY, { method: "GET" })), Error, "POST");
});

test("a signed body that is not a JSON object → refused", async () => {
  const arr = `[ 1,  2 ]`;
  await assertRejects(() => ingest(call(arr)), Error, "Not a Formspark");
  const text = `not json`;
  await assertRejects(() => ingest(call(text)), Error, "not JSON");
});

test("a body with leading and trailing whitespace is verified over the exact bytes", async () => {
  const b = `\n  ${BODY}  \n`;
  assertEquals(evs(await ingest(call(b, { headers: headers(b) }))).length, 1);
  await assertRejects(() => ingest(call(b, { headers: headers(b, NOW, sign(NOW, b.trim())) })));
});

test("onSubscribe makes no vendor call and returns the callback URL; onUnsubscribe is a no-op", async () => {
  const { ctx, calls } = mockCtx();
  const state = await trigger.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await trigger.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
  assertEquals(calls.length, 0);
});
