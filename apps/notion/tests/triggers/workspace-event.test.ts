import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import type { TriggerCall } from "@w6w/types";
import app from "../../index.ts";
import T from "../../triggers/workspace-event.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

const TOKEN = "secret_verification_token_abcdef0123456789";
const PARAMS = { verificationToken: TOKEN };
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const ctx = {} as never;

/** Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY. */
const BODY = `{ "id": "367cba44-b6f3-4c92-81e7-6a2e9a1ac1c8",
  "timestamp" : "2026-11-09T12:00:00.000Z", "workspace_id": "13950b26", "workspace_name": "Acme",
  "subscription_id": "29d75c0d", "integration_id": "0ef2e755", "type": "page.created",
  "authors": [ {"id": "c7c11cca", "type": "person"} ],
  "entity": { "id": "153104cd", "type": "page" }, "data": { "parent": {"id": "59833787", "type": "database"} },
  "attempt_number": 1 }`;
const sign = (body: string, key = TOKEN) =>
  "sha256=" + createHmac("sha256", key).update(body).digest("hex");

function post(body: string | undefined, signature: string | undefined): TriggerCall {
  return {
    method: "POST",
    path: "/",
    query: {},
    headers: signature === undefined ? {} : { "x-notion-signature": signature },
    body: body === undefined ? null : JSON.parse(body),
    ...(body === undefined ? {} : { rawBody: body }),
  };
}

const ingest = (raw: TriggerCall, params: Record<string, unknown> = PARAMS) =>
  Promise.resolve(
    T.handleIngest!(
      { raw, params, state: { callbackUrl: CALLBACK }, subscriptionId: "sub_1" },
      ctx,
    ),
  );

test("fixture really has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares the trigger with output and sample", () => {
  const ts = (app as { triggers: Array<{ key: string; output: unknown[]; sample: unknown }> })
    .triggers;
  assertEquals(ts.map((t) => t.key), ["workspace-event"]);
  assert(ts[0].output.length > 0 && ts[0].sample !== undefined);
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

test("valid signature over the exact raw body emits the event", async () => {
  assertEquals(evs(await ingest(post(BODY, sign(BODY)))), [{
    id: "367cba44-b6f3-4c92-81e7-6a2e9a1ac1c8",
    type: "page.created",
    timestamp: "2026-11-09T12:00:00.000Z",
    workspaceId: "13950b26",
    workspaceName: "Acme",
    subscriptionId: "29d75c0d",
    integrationId: "0ef2e755",
    entityId: "153104cd",
    entityType: "page",
    authors: [{ id: "c7c11cca", type: "person" }],
    data: { parent: { id: "59833787", type: "database" } },
    attemptNumber: 1,
  }]);
});

test("the eventTypes param filters; an empty list passes everything", async () => {
  const raw = post(BODY, sign(BODY));
  assertEquals(evs(await ingest(raw, { ...PARAMS, eventTypes: ["page.deleted"] })), []);
  assertEquals(evs(await ingest(raw, { ...PARAMS, eventTypes: ["page.created"] })).length, 1);
  assertEquals(evs(await ingest(raw, { ...PARAMS, eventTypes: [] })).length, 1);
});

test("a signature over the re-serialised body is refused", async () => {
  const canonical = JSON.stringify(JSON.parse(BODY));
  await assertRejects(() => ingest(post(BODY, sign(canonical))), Error, "signature");
});

test("one flipped byte in the body is refused", async () => {
  const tampered = BODY.replace("page.created", "page.deleted");
  assert(tampered !== BODY);
  await assertRejects(() => ingest(post(tampered, sign(BODY))), Error, "signature");
});

test("a wrong-key signature is refused", async () => {
  await assertRejects(
    () => ingest(post(BODY, sign(BODY, "another-token-xxxxxxxxxxx"))),
    Error,
    "signature",
  );
});

test("missing signature header on an event is refused", async () => {
  await assertRejects(() => ingest(post(BODY, undefined)), Error, "X-Notion-Signature");
});

test("signature without the sha256= prefix is refused", async () => {
  await assertRejects(() => ingest(post(BODY, sign(BODY).slice(7))), Error, "X-Notion-Signature");
});

test("absent rawBody is refused (never falls back to the parsed body)", async () => {
  const raw = post(BODY, sign(BODY));
  delete (raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(raw), Error, "raw body");
});

test("unset or empty verificationToken refuses a signed event, even with an empty signature", async () => {
  for (const verificationToken of [undefined, ""]) {
    for (const sig of ["", "sha256=", sign(BODY)]) {
      await assertRejects(() => ingest(post(BODY, sig), { verificationToken }), Error, "secret");
    }
  }
});

test("the unsigned setup POST carrying only verification_token is acknowledged without an event", async () => {
  const setup = `{ "verification_token" : "${TOKEN}" }`;
  assertEquals(evs(await ingest(post(setup, undefined))), []);
  assertEquals(evs(await ingest(post(setup, undefined), {})), []); // before the user pasted it
});

test("an unsigned body with more than the verification token is refused, not acknowledged", async () => {
  const sneaky = `{ "verification_token": "${TOKEN}", "type": "page.created" }`;
  await assertRejects(() => ingest(post(sneaky, undefined)), Error, "X-Notion-Signature");
});

test("an unsigned event is refused", async () => {
  await assertRejects(() => ingest(post(BODY, undefined)), Error);
});

test("errors never echo the token or the signature", async () => {
  const sig = sign(BODY, "another-token-xxxxxxxxxxx");
  const err = await assertRejects(() => ingest(post(BODY, sig)), Error);
  for (const leak of [TOKEN, sig, sig.slice(7), "another-token-xxxxxxxxxxx"]) {
    assert(!err.message.includes(leak));
  }
});

test("a non-POST method is refused", async () => {
  await assertRejects(() => ingest({ ...post(BODY, sign(BODY)), method: "GET" }), Error, "POST");
});

test("a signed non-JSON body is refused", async () => {
  const bad = "not json";
  const raw: TriggerCall = {
    method: "POST",
    path: "/",
    query: {},
    headers: { "x-notion-signature": sign(bad) },
    body: bad,
    rawBody: bad,
  };
  await assertRejects(() => ingest(raw), Error, "not JSON");
});
