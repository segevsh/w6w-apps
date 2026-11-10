import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import documentParsed from "../../triggers/document-parsed.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "signing-secret-value-for-tests-0123";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "_id" : "67d0d4c4b6b2a1f0c9e8d7a6",
  "name":"invoice.pdf", "content_type": "application/pdf", "status":"parsed",
  "created_at":"2026-11-10T12:00:00.000Z", "processed_at": "2026-11-10T12:00:04.321Z",
  "filename":"invoice.pdf", "credits": 1,
  "json": { "invoice_number":"INV-001", "total": 150, "__meta__": { "external_id": 42 } } }`;

const sign = (b: string, secret = SECRET) =>
  createHmac("sha256", secret).update(b).digest("base64");

const call = (
  b: string,
  over: Record<string, unknown> = {},
  secret: string | undefined | null = SECRET,
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "airparser-signature": sign(b) } as Record<string, string>,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params: { signingSecret: secret === null ? undefined : secret },
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const ingest = (input: ReturnType<typeof call>) =>
  documentParsed.handleIngest!(input, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares the webhook trigger with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), ["document-parsed"]);
  const t = app.triggers[0];
  assert(t.output!.length > 0);
  assert(t.sample !== undefined);
  assertEquals(t.poll, undefined);
  assertEquals(t.params!.map((p) => p.key), ["signingSecret"]);
});

test("valid signature → one normalized event", async () => {
  const out = evs(await ingest(call(BODY))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].documentId, "67d0d4c4b6b2a1f0c9e8d7a6");
  assertEquals(out[0].status, "parsed");
  assertEquals(out[0].credits, 1);
  assertEquals(out[0].processedAt, "2026-11-10T12:00:04.321Z");
  assertEquals((out[0].json as Record<string, unknown>).invoice_number, "INV-001");
  assertEquals((out[0].payload as Record<string, unknown>).filename, "invoice.pdf");
});

test("a payload without a `json` object still delivers, with json null", async () => {
  const b = ` {"id":"d1","status":"parsed","total": 5}`;
  const out = evs(await ingest(call(b))) as Array<Record<string, unknown>>;
  assertEquals(out[0].documentId, "d1");
  assertEquals(out[0].json, null);
});

test("one flipped byte in the body → refused", async () => {
  const c = call(BODY, { rawBody: BODY.replace("INV-001", "INV-002") });
  await assertRejects(() => ingest(c), Error, "signature");
});

test("signature made with another secret → refused", async () => {
  const c = call(BODY, {
    headers: { "airparser-signature": sign(BODY, "another-secret-value-xxxxxxxx") },
  });
  await assertRejects(() => ingest(c), Error, "signature");
});

test("header missing → refused", async () => {
  await assertRejects(() => ingest(call(BODY, { headers: {} })), Error, "airparser-signature");
});

test("rawBody absent → refused, even with a correct signature", async () => {
  const c = call(BODY);
  delete (c.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(c), Error, "raw body");
});

test("unset or empty secret + absent or empty header → refused", async () => {
  for (const secret of [null, ""]) {
    for (const headers of [{}, { "airparser-signature": "" }]) {
      await assertRejects(() => ingest(call(BODY, { headers }, secret)), Error, "secret");
    }
  }
});

test("a body with leading and trailing whitespace is verified over the exact bytes", async () => {
  const b = `\n  ${BODY}  \n`;
  const out = evs(await ingest(call(b, { headers: { "airparser-signature": sign(b) } })));
  assertEquals(out.length, 1);
  await assertRejects(() =>
    ingest(call(b, { headers: { "airparser-signature": sign(b.trim()) } }))
  );
});

test("a signed body that is not a JSON object is refused", async () => {
  const signedRaw = (b: string) =>
    call(BODY, { rawBody: b, headers: { "airparser-signature": sign(b) } });
  await assertRejects(() => ingest(signedRaw("[1,2]")), Error, "JSON object");
  await assertRejects(() => ingest(signedRaw("not json")), Error, "not JSON");
});

test("errors never contain the secret, the signature or the header value", async () => {
  const sig = sign(BODY, "another-secret-value-xxxxxxxx");
  try {
    await ingest(call(BODY, { headers: { "airparser-signature": sig } }));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(sig));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(() => ingest(call(BODY, { method: "GET" })), Error, "POST");
});

test("onSubscribe makes no vendor call and returns the callback URL; onUnsubscribe is a no-op", async () => {
  const { ctx, calls } = mockCtx();
  const state = await documentParsed.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await documentParsed.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
  assertEquals(calls.length, 0);
});
