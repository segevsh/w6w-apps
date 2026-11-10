import { test } from "node:test";
import { createHash, createHmac } from "node:crypto";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import trigger from "../../triggers/inbound-sms.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const KEY = "test-signing-key-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const NOW = Math.floor(Date.now() / 1000);

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const BODY = `{ "id" : "msg-1",  "recipient":"31642500190", "originator" : "31612345678",
  "body":"hello there",   "createdDatetime":"2026-11-10T10:30:00+00:00" }`;

function jwt(
  over: {
    claims?: Record<string, unknown>;
    key?: string;
    header?: Record<string, unknown>;
    body?: string;
    url?: string;
  } = {},
) {
  const header = over.header ?? { typ: "JWT", alg: "HS256" };
  const claims = {
    iss: "MessageBird",
    nbf: NOW - 1,
    exp: NOW + 60,
    jti: "jti-1",
    url_hash: sha(over.url ?? CALLBACK),
    payload_hash: sha(over.body ?? BODY),
    ...over.claims,
  };
  const h = b64u(JSON.stringify(header));
  const p = b64u(JSON.stringify(claims));
  const s = createHmac("sha256", over.key ?? KEY).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${s}`;
}

const call = (
  rawBody: string | null,
  headers: Record<string, string>,
  signingKey: string | null = KEY,
  method = "POST",
) => ({
  raw: {
    method,
    path: "/",
    query: {},
    headers,
    body: null,
    ...(rawBody === null ? {} : { rawBody }),
  },
  params: { signingKey: (signingKey ?? undefined) as string },
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const run = (input: ReturnType<typeof call>) =>
  trigger.handleIngest!(input as never, mockCtx().ctx);
const hdr = (token = jwt()) => ({ "messagebird-signature-jwt": token });

async function refused(fn: () => Promise<unknown>, includes: string) {
  try {
    await fn();
  } catch (err) {
    assert(err instanceof Error && err.message.includes(includes), `message: ${String(err)}`);
    return;
  }
  throw new Error("expected the delivery to be refused");
}

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares the webhook trigger with output and sample, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key), ["inbound-sms"]);
  assert(trigger.output!.length > 0);
  assert(trigger.sample !== undefined);
  assertEquals(trigger.poll, undefined);
});

test("manual webhook: onSubscribe makes no vendor call and returns the callback URL", async () => {
  const m = mockCtx([]);
  const state = await trigger.onSubscribe!(
    { params: {}, callbackUrl: CALLBACK, subscriptionId: "s" } as never,
    m.ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  assertEquals(m.calls.length, 0);
});

test("valid JWT (node:crypto) over the callback URL and exact body → one inbound SMS", async () => {
  const out = evs(await run(call(BODY, hdr()))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].id, "msg-1");
  assertEquals(out[0].originator, "31612345678");
  assertEquals(out[0].recipient, "31642500190");
  assertEquals(out[0].body, "hello there");
});

test("a form-encoded body with a matching payload_hash is parsed too", async () => {
  const form = "id=m2&recipient=31642500190&originator=31612345678&body=hi+there";
  const out = evs(await run(call(form, hdr(jwt({ body: form }))))) as Array<
    Record<string, unknown>
  >;
  assertEquals(out[0].body, "hi there");
});

test("token signed with another key → refused", async () => {
  await refused(
    () => run(call(BODY, hdr(jwt({ key: "another-key-value-xxxxxxxxxxxxxxxx" })))),
    "signature",
  );
});

test("one flipped byte in the body, the token signature or the claims → refused", async () => {
  await refused(() => run(call(BODY.replace("hello", "hellp"), hdr())), "does not match the body");
  const t = jwt();
  const flipped = t.slice(0, -1) + (t.endsWith("A") ? "B" : "A");
  await refused(() => run(call(BODY, hdr(flipped))), "signature");
  const [h, , s] = t.split(".");
  const forged = b64u(
    JSON.stringify({
      iss: "MessageBird",
      nbf: NOW - 1,
      exp: NOW + 99999,
      url_hash: sha(CALLBACK),
      payload_hash: sha(BODY),
    }),
  );
  await refused(() => run(call(BODY, hdr(`${h}.${forged}.${s}`))), "signature");
});

test("header missing or malformed → refused", async () => {
  await refused(() => run(call(BODY, {})), "missing or malformed");
  await refused(() => run(call(BODY, hdr("a.b"))), "missing or malformed");
});

test("alg other than HS256 → refused even with a matching HMAC", async () => {
  await refused(() => run(call(BODY, hdr(jwt({ header: { typ: "JWT", alg: "none" } })))), "HS256");
  await refused(() => run(call(BODY, hdr(jwt({ header: { typ: "JWT", alg: "HS512" } })))), "HS256");
});

test("expired, not-yet-valid, wrong issuer or missing claims → refused", async () => {
  for (
    const claims of [{ exp: NOW - 60 }, { nbf: NOW + 600 }, { iss: "Someone" }, { nbf: undefined }]
  ) {
    await refused(() => run(call(BODY, hdr(jwt({ claims })))), "claims");
  }
  assertEquals(
    (evs(await run(call(BODY, hdr(jwt({ claims: { exp: NOW - 2 } }))))) as unknown[]).length,
    1,
  );
});

test("token for another URL → refused", async () => {
  await refused(() => run(call(BODY, hdr(jwt({ url: "https://other.test/hook" })))), "another URL");
});

test("rawBody absent → refused", async () => {
  await refused(() => run(call(null, hdr())), "raw body");
});

test("unset or empty signing key → refused", async () => {
  for (const key of [null, ""]) {
    await refused(() => run(call(BODY, hdr(), key)), "secret");
  }
});

test("a GET callback is refused (nothing to hash)", async () => {
  await refused(() => run(call(BODY, hdr(), KEY, "GET")), "POST");
});

test("errors never contain the key, the token or the body", async () => {
  const token = jwt({ key: "another-key-value-xxxxxxxxxxxxxxxx" });
  try {
    await run(call(BODY, hdr(token)));
    throw new Error("should have thrown");
  } catch (err) {
    const m = (err as Error).message;
    assert(!m.includes(KEY) && !m.includes(token) && !m.includes("hello there"));
  }
});
