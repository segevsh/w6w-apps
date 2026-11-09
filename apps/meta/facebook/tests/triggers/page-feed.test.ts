import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import type { TriggerCall } from "@w6w/types";
import app from "../../index.ts";
import T from "../../triggers/page-feed.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

const SECRET = "app-secret-value-0123456789";
const VERIFY = "my-verify-token-4242";
const PARAMS = { appSecret: SECRET, verifyToken: VERIFY };
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const ctx = {} as never;

/** Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY. */
const BODY = `{ "object" : "page",
  "entry": [ { "id": "104059235640000", "time": 1731139200, "changes": [
    { "field": "feed", "value": { "from": {"id": "5100000000000001", "name": "Alex Example"},
      "item": "comment", "verb": "add", "post_id": "104059235640000_2204490000000000",
      "comment_id": "2204490000000000_2204491111111111", "parent_id": "104059235640000_2204490000000000",
      "message": "Great post!", "created_time": 1731139200 } },
    { "field": "feed", "value": { "item": "status", "verb": "add", "post_id": "104059235640000_2204492222222222",
      "message": "Hello page", "created_time": 1731139201 } },
    { "field": "ratings", "value": { "item": "rating" } } ] } ] }`;
const sign = (body: string, key = SECRET) =>
  "sha256=" + createHmac("sha256", key).update(body).digest("hex");

function post(body: string | undefined, signature: string | undefined): TriggerCall {
  return {
    method: "POST",
    path: "/",
    query: {},
    headers: signature === undefined ? {} : { "x-hub-signature-256": signature },
    body: body === undefined ? null : JSON.parse(body),
    ...(body === undefined ? {} : { rawBody: body }),
  };
}

function get(query: Record<string, string>): TriggerCall {
  return { method: "GET", path: "/", query, headers: {}, body: null };
}

const ingest = (t: typeof T, raw: TriggerCall, params: Record<string, unknown> = PARAMS) =>
  Promise.resolve(
    t.handleIngest!(
      { raw, params, state: { callbackUrl: CALLBACK }, subscriptionId: "sub_1" },
      ctx,
    ),
  );

test("fixture really has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares the triggers with output and sample", () => {
  const ts =
    (app as { triggers: Array<{ key: string; output: unknown[]; sample: unknown }> }).triggers;
  assertEquals(ts.map((t) => t.key), ["page-feed", "new-comment"]);
  for (const t of ts) {
    assert(t.output.length > 0 && t.sample !== undefined);
  }
});

test("onSubscribe makes no vendor call and returns the callback URL; onUnsubscribe is a no-op", async () => {
  const state = await T.onSubscribe!(
    {
      params: PARAMS,
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "https://api.example.test",
    },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await T.onUnsubscribe!({ params: PARAMS, state, subscriptionId: "sub_1" }, ctx);
});

test("valid signature over the exact raw body emits the events", async () => {
  const out = evs(await ingest(T, post(BODY, sign(BODY))));
  assertEquals(out, [
    {
      pageId: "104059235640000",
      field: "feed",
      item: "comment",
      verb: "add",
      postId: "104059235640000_2204490000000000",
      commentId: "2204490000000000_2204491111111111",
      parentId: "104059235640000_2204490000000000",
      senderId: "5100000000000001",
      senderName: "Alex Example",
      message: "Great post!",
      createdTime: 1731139200,
      value: JSON.parse(BODY).entry[0].changes[0].value,
    },
    {
      pageId: "104059235640000",
      field: "feed",
      item: "status",
      verb: "add",
      postId: "104059235640000_2204492222222222",
      commentId: null,
      parentId: null,
      senderId: null,
      senderName: null,
      message: "Hello page",
      createdTime: 1731139201,
      value: JSON.parse(BODY).entry[0].changes[1].value,
    },
  ]);
});

test("signature compare is case-insensitive on the hex digits", async () => {
  const s = sign(BODY);
  const out = evs(await ingest(T, post(BODY, "sha256=" + s.slice(7).toUpperCase())));
  assertEquals(out.length, 2);
});

test("a body that is not the signed bytes is refused (re-serialised body would verify)", async () => {
  const canonical = JSON.stringify(JSON.parse(BODY));
  const raw = post(BODY, sign(canonical)); // signed over the re-serialised form
  await assertRejects(() => ingest(T, raw), Error, "signature");
});

test("one flipped byte in the body is refused", async () => {
  const tampered = BODY.replace("Great post!", "Great post?");
  assert(tampered !== BODY);
  await assertRejects(() => ingest(T, post(tampered, sign(BODY))), Error, "signature");
});

test("a wrong-key signature is refused", async () => {
  await assertRejects(
    () => ingest(T, post(BODY, sign(BODY, "other-secret-xxxxxxxx"))),
    Error,
    "signature",
  );
});

test("missing signature header is refused", async () => {
  await assertRejects(() => ingest(T, post(BODY, undefined)), Error, "X-Hub-Signature-256");
});

test("signature without the sha256= prefix is refused", async () => {
  await assertRejects(
    () => ingest(T, post(BODY, sign(BODY).slice(7))),
    Error,
    "X-Hub-Signature-256",
  );
});

test("absent rawBody is refused (never falls back to the parsed body)", async () => {
  const raw = post(BODY, sign(BODY));
  delete (raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(T, raw), Error, "raw body");
});

test("unset or empty appSecret refuses, even with an absent or empty signature", async () => {
  for (const appSecret of [undefined, ""]) {
    for (const sig of [undefined, "", "sha256="]) {
      await assertRejects(
        () => ingest(T, post(BODY, sig), { ...PARAMS, appSecret }),
        Error,
        "secret",
      );
    }
  }
});

test("errors never echo the secret, the signature or the verify token", async () => {
  const sig = sign(BODY, "other-secret-xxxxxxxx");
  const err = await assertRejects(() => ingest(T, post(BODY, sig)), Error);
  for (const leak of [SECRET, VERIFY, sig, sig.slice(7), "other-secret-xxxxxxxx"]) {
    assert(!err.message.includes(leak));
  }
});

test("GET handshake with the right verify token echoes hub.challenge", async () => {
  const out = await ingest(
    T,
    get({ "hub.mode": "subscribe", "hub.verify_token": VERIFY, "hub.challenge": "1158201444" }),
  );
  assertEquals(evs(out), []);
  assertEquals((out as { response?: { body?: string } }).response, { body: "1158201444" });
});

test("GET handshake with a wrong verify token is refused", async () => {
  await assertRejects(
    () =>
      ingest(
        T,
        get({ "hub.mode": "subscribe", "hub.verify_token": "nope", "hub.challenge": "1158201444" }),
      ),
    Error,
    "verify token",
  );
});

test("GET handshake with no verify token in the request is refused", async () => {
  await assertRejects(
    () => ingest(T, get({ "hub.mode": "subscribe", "hub.challenge": "1158201444" })),
    Error,
    "verify token",
  );
});

test("GET handshake with unset or empty verifyToken is refused, even if the request token is empty", async () => {
  for (const verifyToken of [undefined, ""]) {
    await assertRejects(
      () =>
        ingest(T, get({ "hub.mode": "subscribe", "hub.verify_token": "", "hub.challenge": "1" }), {
          ...PARAMS,
          verifyToken,
        }),
      Error,
      "secret",
    );
  }
});

test("GET with another mode, or a malformed challenge, is refused", async () => {
  await assertRejects(
    () =>
      ingest(
        T,
        get({ "hub.mode": "unsubscribe", "hub.verify_token": VERIFY, "hub.challenge": "1" }),
      ),
    Error,
    "not a subscription check",
  );
  await assertRejects(
    () =>
      ingest(
        T,
        get({ "hub.mode": "subscribe", "hub.verify_token": VERIFY, "hub.challenge": "<script>" }),
      ),
    Error,
    "challenge",
  );
  await assertRejects(
    () => ingest(T, get({ "hub.mode": "subscribe", "hub.verify_token": VERIFY })),
    Error,
    "challenge",
  );
});

test("a signed delivery for another object type emits nothing", async () => {
  const body = '{ "object": "instagram", "entry": [] }';
  assertEquals(evs(await ingest(T, post(body, sign(body)))), []);
});

test("a signed non-JSON body is refused", async () => {
  await assertRejects(() => ingest(T, post(undefined, undefined)), Error);
  const bad = "not json";
  const raw: TriggerCall = {
    method: "POST",
    path: "/",
    query: {},
    headers: { "x-hub-signature-256": sign(bad) },
    body: bad,
    rawBody: bad,
  };
  await assertRejects(() => ingest(T, raw), Error, "not JSON");
});

test("another method is refused", async () => {
  await assertRejects(() => ingest(T, { ...post(BODY, sign(BODY)), method: "PUT" }), Error, "POST");
});

test("configured secret with a present-but-empty signature header is refused", async () => {
  for (const sig of ["", "sha256="]) {
    await assertRejects(() => ingest(T, post(BODY, sig)), Error, "Meta webhook refused");
  }
});

test("a digest differing only in its last hex digit is refused", async () => {
  const good = sign(BODY);
  const last = good.slice(-1);
  const bad = good.slice(0, -1) + (last === "0" ? "1" : "0");
  await assertRejects(() => ingest(T, post(BODY, bad)), Error, "signature");
});
