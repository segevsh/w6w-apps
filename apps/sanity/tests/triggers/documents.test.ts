import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import created from "../../triggers/document-created.ts";
import updated from "../../triggers/document-updated.ts";
import deleted from "../../triggers/document-deleted.ts";
import { verifySignature } from "../../lib/triggers.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-webhook-secret-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const CONN = { display: { projectId: "p1", dataset: "production" } };

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "_id" : "post-1",  "_type":"post", "_rev":"rev-1", "title":"Hello",
  "body": [ { "_type":"block",   "children":[] } ] }`;

const nowMs = () => Date.now();
// Vendor scheme: t=<unix ms>,v1=<base64url HMAC-SHA256 of "<t>.<body>">
const sig = (t: number, body = BODY, secret = SECRET) =>
  `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("base64url")}`;

const call = (over: Record<string, unknown> = {}, body: string | null = BODY) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: {
      "sanity-webhook-signature": sig(nowMs()),
      "sanity-operation": "create",
      "sanity-document-id": "post-1",
      "sanity-dataset": "production",
      "sanity-project-id": "p1",
      "sanity-transaction-id": "tx1",
      "sanity-webhook-id": "wh1",
      "idempotency-key": "idem-1",
    } as Record<string, string>,
    body: body === null ? null : JSON.parse(body),
    ...(body === null ? {} : { rawBody: body }),
    ...over,
  },
  params: {} as Record<string, unknown>,
  state: { webhookId: "wh1", projectId: "p1", secret: SECRET as string },
  subscriptionId: "sub_1",
});

const ingest = (input: ReturnType<typeof call>, t = created) =>
  t.handleIngest!(input as never, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares three webhook triggers with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "document-created",
    "document-updated",
    "document-deleted",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0, t.key);
    assert(t.sample !== undefined, t.key);
    assertEquals(typeof t.onSubscribe, "function", t.key);
    assertEquals(typeof t.onUnsubscribe, "function", t.key);
    assertEquals(t.poll, undefined, t.key);
  }
});

test("valid signature (node:crypto, base64url) → one normalized event", async () => {
  const out = evs(await ingest(call())) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].operation, "create");
  assertEquals(out[0].documentId, "post-1");
  assertEquals(out[0].documentType, "post");
  assertEquals(out[0].dataset, "production");
  assertEquals(out[0].idempotencyKey, "create:post-1:rev-1");
  assertEquals((out[0].document as Record<string, unknown>).title, "Hello");
});

test("replay with edited unsigned headers does not change the emitted identity", async () => {
  const base = evs(await ingest(call())) as Array<Record<string, unknown>>;
  const tampered = call();
  Object.assign(tampered.raw.headers, {
    "sanity-operation": "delete",
    "sanity-document-id": "someone-elses-doc",
    "idempotency-key": "fresh-key-per-replay",
  });
  const out = evs(await ingest(tampered)) as Array<Record<string, unknown>>;
  assertEquals(out[0].operation, "create");
  assertEquals(out[0].documentId, "post-1");
  assertEquals(out[0].idempotencyKey, base[0].idempotencyKey);
});

test("body without _id/_rev: headers are only a fallback", async () => {
  const b = `{ "_type": "post" }`;
  const c = call({ rawBody: b, body: JSON.parse(b), headers: {
    "sanity-webhook-signature": sig(nowMs(), b),
    "sanity-document-id": "hdr-doc",
    "idempotency-key": "hdr-key",
  } }, b);
  const out = evs(await ingest(c)) as Array<Record<string, unknown>>;
  assertEquals(out[0].documentId, "hdr-doc");
  assertEquals(out[0].idempotencyKey, "hdr-key");
});

test("one flipped byte in the body → refused", async () => {
  await assertRejects(
    () => ingest(call({ rawBody: BODY.replace("Hello", "Hullo") })),
    Error,
    "signature does not match",
  );
});

test("signature under another secret → refused", async () => {
  const h = { "sanity-webhook-signature": sig(nowMs(), BODY, "some-other-secret-xxxxxxxxxxxx") };
  await assertRejects(() => ingest(call({ headers: h })), Error, "signature does not match");
});

test("header missing or malformed → refused", async () => {
  await assertRejects(() => ingest(call({ headers: {} })), Error, "sanity-webhook-signature");
  for (const v of ["garbage", `t=${nowMs()}`, "v1=abc", "t=abc,v1=abc"]) {
    await assertRejects(
      () => ingest(call({ headers: { "sanity-webhook-signature": v } })),
      Error,
      "malformed",
    );
  }
});

test("rawBody absent → refused, even with a correct signature", async () => {
  await assertRejects(() => ingest(call({}, null)), Error, "raw body");
});

test("stale timestamp (correctly signed) → refused", async () => {
  const t = nowMs() - 10 * 60 * 1000;
  await assertRejects(
    () => ingest(call({ headers: { "sanity-webhook-signature": sig(t) } })),
    Error,
    "allowed window",
  );
});

test("timestamp window is 300 s either side (ms timestamps)", async () => {
  const now = 1_800_000_000_000;
  const raw = (ts: number) => ({
    rawBody: BODY,
    headers: { "sanity-webhook-signature": sig(ts) },
  });
  assertEquals(await verifySignature(raw(now - 299_000), SECRET, now), BODY);
  assertEquals(await verifySignature(raw(now + 299_000), SECRET, now), BODY);
  await assertRejects(() => verifySignature(raw(now - 301_000), SECRET, now), Error, "window");
  await assertRejects(() => verifySignature(raw(now + 301_000), SECRET, now), Error, "window");
});

test("unset or empty secret + absent or empty header → refused", async () => {
  for (const secret of [undefined, ""]) {
    for (const headers of [{}, { "sanity-webhook-signature": "" }]) {
      const c = call({ headers });
      c.state.secret = secret as unknown as string;
      await assertRejects(() => ingest(c), Error, "secret");
    }
  }
});

test("errors never echo the secret or the signature", async () => {
  const c = call({ headers: { "sanity-webhook-signature": `t=${nowMs()},v1=deadbeefcafe` } });
  try {
    await ingest(c);
    assert(false, "should have thrown");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes("deadbeefcafe"));
  }
});

test("onSubscribe POSTs a document webhook for the trigger's operation and keeps id + secret", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "wh9", type: "document" } }], CONN);
  const state = await updated.onSubscribe!(
    {
      params: { filter: '_type == "post"', includeDrafts: true },
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    ctx,
  );
  assertEquals(state.webhookId, "wh9");
  assertEquals(state.projectId, "p1");
  assert(state.secret.length >= 32);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://p1.api.sanity.io/v2025-02-19/hooks/projects/p1");
  assertEquals(JSON.parse(calls[0].body!), {
    type: "document",
    name: "w6w-sub_1",
    url: CALLBACK,
    dataset: "production",
    rule: { on: ["update"], filter: '_type == "post"' },
    apiVersion: "v2025-02-19",
    httpMethod: "POST",
    includeDrafts: true,
    secret: state.secret,
    isDisabledByUser: false,
  });
});

test("onSubscribe: explicit dataset wins, the delete trigger registers `delete`", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wh9" } }], CONN);
  await deleted.onSubscribe!(
    { params: { dataset: "staging" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.dataset, "staging");
  assertEquals(sent.rule, { on: ["delete"] });
  assertEquals(sent.includeDrafts, false);
});

test("onSubscribe refuses a response without an id", async () => {
  const { ctx } = mockCtx([{ body: {} }], CONN);
  await assertRejects(
    () =>
      created.onSubscribe!(
        { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "no id",
  );
});

test("onUnsubscribe DELETEs the webhook; 404 and 410 = already gone; 500 rethrows", async () => {
  const input = {
    params: {},
    state: { webhookId: "wh9", projectId: "p1", secret: "s" },
    subscriptionId: "sub_1",
  };
  const ok = mockCtx([{ status: 200, body: { id: "wh9" } }], CONN);
  await created.onUnsubscribe!(input, ok.ctx);
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(ok.calls[0].url, "https://p1.api.sanity.io/v2025-02-19/hooks/projects/p1/wh9");
  const gone = mockCtx([{ status: 404, body: { message: "not found" } }], CONN);
  await created.onUnsubscribe!(input, gone.ctx);
  const goneToo = mockCtx([{ status: 410, body: { message: "gone" } }], CONN);
  await created.onUnsubscribe!(input, goneToo.ctx);
  const bad = mockCtx([{ status: 500, body: { message: "boom" } }], CONN);
  await assertRejects(() => created.onUnsubscribe!(input, bad.ctx), Error, "500");
});
