import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import trigger from "../../triggers/messenger-event.ts";
const newMessage = trigger;

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const APP_SECRET = "test-app-secret-0123456789";
const VERIFY = "test-verify-token-0123";

const sign = (body: string, key = APP_SECRET) =>
  "sha256=" + createHmac("sha256", key).update(body).digest("hex");

const item = (extra: string) =>
  `{ "sender" : {"id":"psid-1"},  "recipient":{"id":"page-1"}, "timestamp": 1762770600000, ${extra} }`;

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const BODY = `{ "object" : "page",
  "entry": [ { "id":"page-1", "time": 1762770600001, "messaging": [
    ${item(`"message": { "mid":"m_1", "text":"h\\u00e9llo", "quick_reply": {"payload":"QR"} }`)},
    ${item(`"message": { "mid":"m_echo", "is_echo": true, "text":"mine" }`)},
    ${
  item(
    `"postback": { "mid":"m_2", "title":"Get Started", "payload":"GS",  "referral": {"ref":"r"} }`,
  )
},
    ${item(`"delivery": { "mids": ["m_1","m_3"], "watermark": 1762770600005 }`)}
  ] } ] }`;

const post = (
  rawBody: string | null,
  headers: Record<string, string>,
  appSecret: string | null = APP_SECRET,
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers,
    body: rawBody === null ? null : JSON.parse(rawBody),
    ...(rawBody === null ? {} : { rawBody }),
  },
  params: { appSecret: (appSecret ?? undefined) as string, verifyToken: VERIFY },
  state: { callbackUrl: "https://api.example.test/triggers/webhooks/sub_1" },
  subscriptionId: "sub_1",
});

const get = (query: Record<string, string>, verifyToken: string | null = VERIFY) => ({
  raw: { method: "GET", path: "/", query, headers: {}, body: null },
  params: { appSecret: APP_SECRET, verifyToken: (verifyToken ?? undefined) as string },
  state: {},
  subscriptionId: "sub_1",
});

type Trig = typeof trigger;
const run = (t: Trig, input: ReturnType<typeof post> | ReturnType<typeof get>) =>
  t.handleIngest!(input as never, mockCtx().ctx);

async function refused(fn: () => Promise<unknown>, includes: string) {
  try {
    await fn();
  } catch (err) {
    assert(err instanceof Error && err.message.includes(includes), `message: ${String(err)}`);
    return;
  }
  throw new Error("expected the request to be refused");
}

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares the webhook trigger with output and sample, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key), ["messenger-event"]);
  assert(trigger.output!.length > 0);
  assert(trigger.sample !== undefined);
  assertEquals(trigger.poll, undefined);
});

test("manual webhook: onSubscribe makes no vendor call and returns the callback URL", async () => {
  const m = mockCtx([]);
  const state = await newMessage.onSubscribe!(
    { params: {}, callbackUrl: "https://api.example.test/x", subscriptionId: "s" } as never,
    m.ctx,
  );
  assertEquals(state, { callbackUrl: "https://api.example.test/x" });
  assertEquals(m.calls.length, 0);
});

test("valid signature (node:crypto) → every kind in order; echoes are skipped", async () => {
  const input = post(BODY, { "x-hub-signature-256": sign(BODY) });
  const all = evs(await run(trigger, input)) as Array<Record<string, unknown>>;
  assertEquals(all.map((e) => e.kind), ["message", "postback", "delivery"]);
  assertEquals(all[0].messageId, "m_1");
  assertEquals(all[0].text, "héllo");
  assertEquals(all[0].quickReplyPayload, "QR");
  assertEquals(all[0].senderId, "psid-1");
  assertEquals(all[0].pageId, "page-1");
  assertEquals(all[1].postbackTitle, "Get Started");
  assertEquals(all[1].postbackPayload, "GS");
  assertEquals(all[1].referral, { ref: "r" });
  assertEquals(all[2].deliveredMessageIds, ["m_1", "m_3"]);
  assertEquals(all[2].watermark, 1762770600005);
});

test("the kinds param narrows the events; an unknown kind is refused", async () => {
  const headers = { "x-hub-signature-256": sign(BODY) };
  const only = (kinds: string) => ({
    ...post(BODY, headers),
    params: { ...post(BODY, headers).params, kinds },
  });
  assertEquals(
    (evs(await run(trigger, only("postback, delivery"))) as Array<Record<string, unknown>>).map((
      e,
    ) => e.kind),
    ["postback", "delivery"],
  );
  await refused(() => run(trigger, only("reads")), "reads");
});

test("signature made with another secret → refused", async () => {
  await refused(
    () =>
      run(newMessage, post(BODY, { "x-hub-signature-256": sign(BODY, "another-secret-xxxxxxxx") })),
    "signature",
  );
});

test("one flipped byte in the body → refused", async () => {
  const headers = { "x-hub-signature-256": sign(BODY) };
  await refused(() => run(newMessage, post(BODY.replace("m_1", "m_9"), headers)), "signature");
});

test("one flipped byte in the signature → refused", async () => {
  const s = sign(BODY);
  const flipped = s.slice(0, -1) + (s.endsWith("0") ? "1" : "0");
  await refused(() => run(newMessage, post(BODY, { "x-hub-signature-256": flipped })), "signature");
});

test("signature header missing, or without the sha256= prefix → refused", async () => {
  await refused(() => run(newMessage, post(BODY, {})), "missing or malformed");
  await refused(
    () => run(newMessage, post(BODY, { "x-hub-signature-256": sign(BODY).slice(7) })),
    "missing or malformed",
  );
});

test("rawBody absent → refused", async () => {
  await refused(
    () => run(newMessage, post(null, { "x-hub-signature-256": sign(BODY) })),
    "raw body",
  );
});

test("unset or empty app secret → refused", async () => {
  for (const secret of [null, ""]) {
    await refused(
      () => run(newMessage, post(BODY, { "x-hub-signature-256": sign(BODY) }, secret)),
      "secret",
    );
  }
});

test("a signed body that is not a page notification is refused", async () => {
  const body = `{ "object": "instagram", "entry": [] }`;
  await refused(
    () => run(newMessage, post(body, { "x-hub-signature-256": sign(body) })),
    "page notification",
  );
});

test("verification (GET): matching token echoes the challenge as plain text", async () => {
  const result = await run(
    newMessage,
    get({ "hub.mode": "subscribe", "hub.verify_token": VERIFY, "hub.challenge": "1158201444" }),
  );
  assertEquals(evs(result), []);
  assertEquals((result as { response: unknown }).response, {
    status: 200,
    headers: { "content-type": "text/plain" },
    body: "1158201444",
  });
});

test("verification (GET): wrong token, wrong mode, missing or odd challenge → refused", async () => {
  const q = { "hub.mode": "subscribe", "hub.verify_token": VERIFY, "hub.challenge": "42" };
  await refused(
    () => run(newMessage, get({ ...q, "hub.verify_token": VERIFY + "x" })),
    "does not match",
  );
  await refused(() => run(newMessage, get({ ...q, "hub.mode": "unsubscribe" })), "not a subscribe");
  await refused(
    () => run(newMessage, get({ "hub.mode": "subscribe", "hub.challenge": "42" })),
    "not a subscribe",
  );
  await refused(() => run(newMessage, get({ ...q, "hub.challenge": "<script>" })), "challenge");
  await refused(
    () => run(newMessage, get({ "hub.mode": "subscribe", "hub.verify_token": VERIFY })),
    "challenge",
  );
});

test("verification (GET): unset or empty verify token → refused, even with an empty query token", async () => {
  for (const token of [null, ""]) {
    await refused(
      () =>
        run(
          newMessage,
          get({ "hub.mode": "subscribe", "hub.verify_token": "", "hub.challenge": "42" }, token),
        ),
      "secret",
    );
  }
});

test("an unsupported method is refused; errors never echo the secrets", async () => {
  await refused(
    () => run(newMessage, { ...post(BODY, {}), raw: { ...post(BODY, {}).raw, method: "PUT" } }),
    "POST",
  );
  const bad = sign(BODY, "another-secret-xxxxxxxx");
  try {
    await run(newMessage, post(BODY, { "x-hub-signature-256": bad }));
    throw new Error("should have thrown");
  } catch (err) {
    const m = (err as Error).message;
    assert(!m.includes(APP_SECRET) && !m.includes(bad.slice(7)) && !m.includes("m_1"));
  }
  try {
    await run(
      newMessage,
      get({
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong-token-value",
        "hub.challenge": "1",
      }),
    );
    throw new Error("should have thrown");
  } catch (err) {
    const m = (err as Error).message;
    assert(!m.includes(VERIFY) && !m.includes("wrong-token-value"));
  }
});
