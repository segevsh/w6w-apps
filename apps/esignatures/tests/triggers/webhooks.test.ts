import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import contractEvent from "../../triggers/contract-event.ts";
import contractSent from "../../triggers/contract-sent.ts";
import contractSigned from "../../triggers/contract-signed.ts";
import signerSigned from "../../triggers/signer-signed.ts";
import signerDeclined from "../../triggers/signer-declined.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "secret-token-for-tests-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const SIGNER = `{ "id":"6signer6-9999",  "name":"Sam Signer", "email":"sam@example.com",
    "mobile":"+12481234567", "company_name":"ACME Corp" }`;
const CONTRACT = `{ "id":"1contr11-2222", "title":"Sample NDA", "metadata":"ID0001",
    "source":"api", "test":"no" }`;
const body = (status: string, extra = "") =>
  `{ "status" : "${status}",
  "data" : { ${extra} "signer" : ${SIGNER},  "contract" : ${CONTRACT} } }`;

const hex = (b: string, secret = SECRET) => createHmac("sha256", secret).update(b).digest("hex");
const b64 = (b: string, secret = SECRET) => createHmac("sha256", secret).update(b).digest("base64");

const call = (
  b: string,
  over: Record<string, unknown> = {},
  secret: string | undefined | null = SECRET,
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "x-signature-sha256": hex(b) } as Record<string, string>,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params: { signingSecret: secret === null ? undefined : secret },
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const ingest = (t: typeof contractEvent, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(body("signer-signed"))) !== body("signer-signed"));
});

test("app declares the five original webhook triggers with output, sample and a secret param", () => {
  assertEquals(app.triggers.map((t) => t.key).slice(0, 5), [
    "contract-event",
    "contract-sent",
    "contract-signed",
    "signer-signed",
    "signer-declined",
  ]);
  for (const t of app.triggers.slice(0, 5)) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    const expected = t.key === "contract-event"
      ? [["signingSecret", "secret"], ["events", "string"]]
      : [["signingSecret", "secret"]];
    assertEquals(t.params!.map((p) => [p.key, p.type]), expected);
  }
});

test("valid signature → one normalized event (signer notification)", async () => {
  const out = evs(await ingest(signerSigned, call(body("signer-signed")))) as Array<
    Record<string, unknown>
  >;
  assertEquals(out.length, 1);
  assertEquals(out[0].status, "signer-signed");
  assertEquals(out[0].contractId, "1contr11-2222");
  assertEquals(out[0].title, "Sample NDA");
  assertEquals(out[0].metadata, "ID0001");
  assertEquals((out[0].signer as Record<string, unknown>).email, "sam@example.com");
});

test("the signed-contract notification carries the PDF link and every signer", async () => {
  const b =
    `{ "status": "contract-signed", "data": { "contract": { "id":"c9", "title":"T",  "metadata":"m",
    "source":"ui", "test":"yes", "contract_pdf_url":"https://example.test/c9.pdf",
    "signers":[ ${SIGNER} ] } } }`;
  const out = evs(await ingest(contractSigned, call(b))) as Array<Record<string, unknown>>;
  assertEquals(out[0].pdfUrl, "https://example.test/c9.pdf");
  assertEquals((out[0].signers as unknown[]).length, 1);
  assertEquals(out[0].source, "ui");
  assertEquals(out[0].test, "yes");
});

test("a decline carries the reason", async () => {
  const b = body("signer-declined", `"reason_for_decline" : "Wrong date",`);
  const out = evs(await ingest(signerDeclined, call(b))) as Array<Record<string, unknown>>;
  assertEquals(out[0].reasonForDecline, "Wrong date");
});

test("an error notification names the contract", async () => {
  const b =
    `{ "status" : "error", "data" : { "error_code":"email-delivery-failed", "contract_id":"c7", "metadata":"m" } }`;
  const out = evs(await ingest(contractEvent, call(b))) as Array<Record<string, unknown>>;
  assertEquals(out[0].status, "error");
  assertEquals(out[0].contractId, "c7");
});

test("each trigger keeps only its own status; Contract Event keeps all", async () => {
  const cases: Array<[typeof contractEvent, string]> = [
    [contractSent, "contract-sent-to-signer"],
    [contractSigned, "contract-signed"],
    [signerSigned, "signer-signed"],
    [signerDeclined, "signer-declined"],
  ];
  for (const [t, status] of cases) {
    assertEquals(evs(await ingest(t, call(body(status)))).length, 1, status);
    assertEquals(evs(await ingest(t, call(body("signer-viewed-the-contract")))), [], status);
    assertEquals(evs(await ingest(contractEvent, call(body(status)))).length, 1, status);
  }
});

test("the base64 form of the same HMAC verifies too", async () => {
  const b = body("signer-signed");
  const c = call(b, { headers: { "x-signature-sha256": b64(b) } });
  assertEquals(evs(await ingest(signerSigned, c)).length, 1);
});

test("one flipped byte in the body → refused", async () => {
  const b = body("signer-signed");
  await assertRejects(
    () => ingest(signerSigned, call(b, { rawBody: b.replace("Sample NDA", "Sample NDB") })),
    Error,
    "signature",
  );
});

test("signature made with another secret → refused (hex and base64)", async () => {
  const b = body("signer-signed");
  const other = "another-secret-value-xxxxxxxx";
  for (const sig of [hex(b, other), b64(b, other)]) {
    await assertRejects(
      () => ingest(signerSigned, call(b, { headers: { "x-signature-sha256": sig } })),
      Error,
      "signature",
    );
  }
});

test("header missing → refused", async () => {
  await assertRejects(
    () => ingest(signerSigned, call(body("signer-signed"), { headers: {} })),
    Error,
    "X-Signature-SHA256",
  );
});

test("rawBody absent → refused, even with a correct signature", async () => {
  const c = call(body("signer-signed"));
  delete (c.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(signerSigned, c), Error, "raw body");
});

test("unset or empty secret + absent or empty header → refused", async () => {
  for (const secret of [null, ""]) {
    for (const headers of [{}, { "x-signature-sha256": "" }]) {
      await assertRejects(
        () => ingest(signerSigned, call(body("signer-signed"), { headers }, secret)),
        Error,
        "secret",
      );
    }
  }
});

test("errors never contain the secret, the signature or the header value", async () => {
  const b = body("signer-signed");
  const sig = hex(b, "another-secret-value-xxxxxxxx");
  try {
    await ingest(signerSigned, call(b, { headers: { "x-signature-sha256": sig } }));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(sig));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(
    () => ingest(signerSigned, call(body("signer-signed"), { method: "GET" })),
    Error,
    "POST",
  );
});

test("a signed body that is not a notification → refused", async () => {
  await assertRejects(
    () => ingest(signerSigned, call(`{ "hello" : "world" }`)),
    Error,
    "Not an eSignatures",
  );
});

test("onSubscribe makes no vendor call and returns the callback URL; onUnsubscribe is a no-op", async () => {
  const { ctx, calls } = mockCtx();
  const state = await signerSigned.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await signerSigned.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
  assertEquals(calls.length, 0);
});
