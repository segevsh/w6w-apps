import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import trigger from "../../triggers/new-response.ts";
import { tagFor } from "../../lib/triggers.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "s3cr3t-value-for-tests-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "event_id" : "EVT1",  "event_type":"form_response",
  "form_response": { "form_id":"lT9Z2j", "token":"tok1", "submitted_at":"2026-11-09T10:15:00Z",
  "landed_at":"2026-11-09T10:14:00Z", "hidden":{"a":"b"}, "definition":{"id":"lT9Z2j","title":"Feedback"},
  "answers":[{"type":"text","text":"hi","field":{"id":"Q1"}}] } }`;

const sign = (body: string, secret = SECRET) =>
  "sha256=" + createHmac("sha256", secret).update(body).digest("base64");

const call = (over: Record<string, unknown> = {}, body: string | null = BODY) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "typeform-signature": sign(BODY) } as Record<string, string>,
    body: body === null ? null : JSON.parse(body),
    ...(body === null ? {} : { rawBody: body }),
    ...over,
  },
  params: { formId: "lT9Z2j" },
  state: { formId: "lT9Z2j", tag: "w6w-sub1", secret: SECRET },
  subscriptionId: "sub_1",
});

const ingest = (input: ReturnType<typeof call>) => trigger.handleIngest!(input, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares the webhook trigger with output and sample", () => {
  assertEquals(app.triggers[0].key, "new-response");
  assert(trigger.output!.length > 0);
  assert(trigger.sample !== undefined);
  assertEquals(typeof trigger.onSubscribe, "function");
  assertEquals(typeof trigger.onUnsubscribe, "function");
  assertEquals(trigger.poll, undefined);
});

test("valid signature → one normalized event", async () => {
  const out = evs(await ingest(call())) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].responseId, "tok1");
  assertEquals(out[0].formId, "lT9Z2j");
  assertEquals(out[0].formTitle, "Feedback");
  assertEquals(out[0].eventId, "EVT1");
  assertEquals(out[0].hidden, { a: "b" });
});

test("a delivery for another form is acknowledged with no event", async () => {
  const other = BODY.replace('"form_id":"lT9Z2j"', '"form_id":"zzzzzz"');
  const c = call({ rawBody: other, headers: { "typeform-signature": sign(other) } }, other);
  assertEquals(evs(await ingest(c)), []);
});

test("one flipped byte in the body → refused", async () => {
  const tampered = BODY.replace("tok1", "tok2");
  await assertRejects(() => ingest(call({ rawBody: tampered })), Error, "signature");
});

test("signature made with another secret → refused", async () => {
  const c = call({
    headers: { "typeform-signature": sign(BODY, "another-secret-value-xxxxxxxx") },
  });
  await assertRejects(() => ingest(c), Error, "signature");
});

test("header missing → refused", async () => {
  await assertRejects(() => ingest(call({ headers: {} })), Error, "Typeform-Signature");
});

test("hex digest or missing sha256= prefix → refused", async () => {
  const bare = createHmac("sha256", SECRET).update(BODY).digest("base64");
  await assertRejects(() => ingest(call({ headers: { "typeform-signature": bare } })), Error);
});

test("rawBody absent → refused, even with a correct signature", async () => {
  await assertRejects(() => ingest(call({}, null)), Error, "raw body");
});

test("unset or empty secret + absent header → refused", async () => {
  for (const secret of [undefined, ""]) {
    const c = call({ headers: {} });
    (c.state as { secret?: string }).secret = secret;
    await assertRejects(() => ingest(c), Error, "secret");
  }
});

test("unset or empty secret + empty header → refused", async () => {
  for (const secret of [undefined, ""]) {
    const c = call({ headers: { "typeform-signature": "" } });
    (c.state as { secret?: string }).secret = secret;
    await assertRejects(() => ingest(c), Error, "secret");
  }
});

test("errors never contain the secret, the signature or the header value", async () => {
  const sig = sign(BODY, "another-secret-value-xxxxxxxx");
  try {
    await ingest(call({ headers: { "typeform-signature": sig } }));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(sig) && !m.includes(sig.slice(7)));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(() => ingest(call({ method: "GET" })), Error, "POST");
});

test("tagFor keeps only tag-safe characters", () => {
  assertEquals(tagFor("sub_1/../x y"), "w6w-sub_1xy");
});

test("onSubscribe PUTs the webhook with a random secret and keeps it in state", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", tag: "w6w-sub_1", enabled: true } }]);
  const state = await trigger.onSubscribe!(
    { params: { formId: "lT9Z2j" }, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  ) as { formId: string; tag: string; secret: string };
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/forms/lT9Z2j/webhooks/w6w-sub_1");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.url, CALLBACK);
  assertEquals(sent.enabled, true);
  assertEquals(sent.verify_ssl, true);
  assert(/^[0-9a-f]{64}$/.test(sent.secret));
  assertEquals(state, { formId: "lT9Z2j", tag: "w6w-sub_1", secret: sent.secret });
});

test("onSubscribe without a form id fails before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      trigger.onSubscribe!(
        { params: { formId: " " }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "form",
  );
  assertEquals(calls.length, 0);
});

test("onUnsubscribe DELETEs the webhook; 404 and 410 are already gone; 500 propagates", async () => {
  const state = { formId: "lT9Z2j", tag: "w6w-sub_1", secret: SECRET };
  const ok = mockCtx([{ status: 204 }]);
  await trigger.onUnsubscribe!(
    { params: { formId: "lT9Z2j" }, state, subscriptionId: "s" },
    ok.ctx,
  );
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(new URL(ok.calls[0].url).pathname, "/forms/lT9Z2j/webhooks/w6w-sub_1");
  for (const status of [404, 410]) {
    const gone = mockCtx([{ status, body: { code: "NOT_FOUND" } }]);
    await trigger.onUnsubscribe!(
      { params: { formId: "lT9Z2j" }, state, subscriptionId: "s" },
      gone.ctx,
    );
  }
  const boom = mockCtx([{ status: 500, body: "x" }]);
  await assertRejects(() =>
    trigger.onUnsubscribe!({ params: { formId: "lT9Z2j" }, state, subscriptionId: "s" }, boom.ctx)
  );
});
