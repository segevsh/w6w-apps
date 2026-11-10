import { test } from "node:test";
import { createHmac } from "node:crypto";
import nodeAssert from "node:assert/strict";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import completed from "../../triggers/document-completed.ts";
import created from "../../triggers/document-created.ts";
import signed from "../../triggers/invite-signed.ts";

// This app's generated _assert.ts has no assert/assertRejects: use node:assert directly.
const assert = (expr: unknown, msg?: string): void => nodeAssert.ok(expr, msg);
const assertRejects = (fn: () => Promise<unknown>, _E: unknown, includes: string) =>
  nodeAssert.rejects(
    fn,
    (e: unknown) => e instanceof Error && e.message.toLowerCase().includes(includes.toLowerCase()),
  );

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-callback-secret-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "meta" : { "timestamp":1762770000,  "event":"user.document.complete",
  "environment":"https://app.signnow.com/api", "callback_url":"https://api.example.test/x",
  "access_token":"********", "initiator_id":"U1" },
  "content": { "document_id":"D1", "document_name":"Sales Agreement",  "user_id":"U1" } }`;

const sig = (body = BODY, secret = SECRET) =>
  createHmac("sha256", secret).update(body).digest("base64");

const call = (over: Record<string, unknown> = {}, body: string | null = BODY) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "x-signnow-signature": sig() } as Record<string, string>,
    body: body === null ? null : JSON.parse(body),
    ...(body === null ? {} : { rawBody: body }),
    ...over,
  },
  params: {} as Record<string, never>,
  state: { subscriptionId: "S1", secret: SECRET as string },
  subscriptionId: "sub_1",
});

const ingest = (input: ReturnType<typeof call>, t = completed) =>
  t.handleIngest!(input as never, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares three webhook triggers with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "document-created",
    "document-completed",
    "invite-signed",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0, t.key);
    assert(t.sample !== undefined, t.key);
    assertEquals(typeof t.onSubscribe, "function", t.key);
    assertEquals(typeof t.onUnsubscribe, "function", t.key);
    assertEquals(t.poll, undefined, t.key);
  }
});

test("valid signature (node:crypto) → one normalized event, access token not carried", async () => {
  const out = evs(await ingest(call())) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].event, "user.document.complete");
  assertEquals(out[0].documentId, "D1");
  assertEquals(out[0].documentName, "Sales Agreement");
  assertEquals(out[0].userId, "U1");
  assertEquals(out[0].initiatorId, "U1");
  assertEquals(out[0].timestamp, 1762770000);
  assert(!JSON.stringify(out[0]).includes("access_token"));
});

test("a signed delivery of another event is acknowledged with no event", async () => {
  assertEquals(evs(await ingest(call(), created)), []);
  assertEquals(evs(await ingest(call(), signed)), []);
});

test("hex-encoded signature (the wrong encoding) → refused", async () => {
  const hex = createHmac("sha256", SECRET).update(BODY).digest("hex");
  await assertRejects(
    () => ingest(call({ headers: { "x-signnow-signature": hex } })),
    Error,
    "signature",
  );
});

test("base64 signature case-folded → refused (base64 is case-sensitive)", async () => {
  await assertRejects(
    () => ingest(call({ headers: { "x-signnow-signature": sig().toLowerCase() } })),
    Error,
    "signature",
  );
});

test("one flipped byte in the body → refused", async () => {
  await assertRejects(
    () => ingest(call({ rawBody: BODY.replace("D1", "D2") })),
    Error,
    "signature",
  );
});

test("signature under another secret → refused", async () => {
  const h = { "x-signnow-signature": sig(BODY, "some-other-secret-xxxxxxxxxxxx") };
  await assertRejects(() => ingest(call({ headers: h })), Error, "signature");
});

test("header missing or empty → refused", async () => {
  await assertRejects(() => ingest(call({ headers: {} })), Error, "X-SignNow-Signature");
  await assertRejects(
    () => ingest(call({ headers: { "x-signnow-signature": "" } })),
    Error,
    "X-SignNow-Signature",
  );
});

test("rawBody absent → refused, even with a correct signature", async () => {
  await assertRejects(() => ingest(call({}, null)), Error, "raw body");
});

test("unset or empty secret + absent or empty header → refused", async () => {
  for (const secret of [undefined, ""]) {
    for (const headers of [{}, { "x-signnow-signature": "" }]) {
      const c = call({ headers });
      c.state.secret = secret as unknown as string;
      await assertRejects(() => ingest(c), Error, "secret");
    }
  }
});

test("errors never echo the secret or the signature", async () => {
  const c = call({ headers: { "x-signnow-signature": "deadbeefcafe" } });
  try {
    await ingest(c);
    assert(false, "should have thrown");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes("deadbeefcafe"));
  }
});

test("onSubscribe reads the user, registers the user-level event with a secret_key, keeps id + secret", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "U1" } },
    { status: 201, body: { data: { id: "SUB1" } } },
  ]);
  const state = await completed.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  ) as { subscriptionId: string; secret: string };
  assertEquals(state.subscriptionId, "SUB1");
  assert(state.secret.length >= 32);
  assertEquals(calls.length, 2);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.signnow.com/user");
  assertEquals(calls[1].method, "POST");
  assertEquals(calls[1].url, "https://api.signnow.com/v2/event-subscriptions");
  assertEquals(JSON.parse(calls[1].body!), {
    event: "user.document.complete",
    entity_id: "U1",
    attributes: { callback: CALLBACK, secret_key: state.secret },
  });
});

test("onSubscribe refuses a response without an id", async () => {
  const { ctx } = mockCtx([{ body: { id: "U1" } }, { status: 201, body: {} }]);
  await assertRejects(
    () =>
      completed.onSubscribe!(
        { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "no id",
  );
});

test("onUnsubscribe DELETEs /v2/event-subscriptions/{id}; 404 and 410 = already gone; 500 rethrows", async () => {
  const input = {
    params: {},
    state: { subscriptionId: "SUB1", secret: "s" },
    subscriptionId: "sub_1",
  };
  const ok = mockCtx([{ status: 204 }]);
  await completed.onUnsubscribe!(input, ok.ctx);
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(ok.calls[0].url, "https://api.signnow.com/v2/event-subscriptions/SUB1");
  const gone = mockCtx([{ status: 404, body: { errors: [{ code: 1, message: "gone" }] } }]);
  await completed.onUnsubscribe!(input, gone.ctx);
  const goneToo = mockCtx([{ status: 410, body: { errors: [{ code: 1, message: "gone" }] } }]);
  await completed.onUnsubscribe!(input, goneToo.ctx);
  const bad = mockCtx([{ status: 500, body: "boom" }]);
  await assertRejects(() => completed.onUnsubscribe!(input, bad.ctx), Error, "500");
});
