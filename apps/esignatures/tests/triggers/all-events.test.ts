import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "secret-token-for-tests-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Every webhook trigger → the notification status it keeps (null = Contract Event, all statuses).
const STATUS_OF: Record<string, string | null> = {
  "contract-event": null,
  "contract-sent": "contract-sent-to-signer",
  "contract-signed": "contract-signed",
  "signer-signed": "signer-signed",
  "signer-declined": "signer-declined",
  "contract-reminder-sent": "contract-reminder-sent-to-signer",
  "contract-withdrawn": "contract-withdrawn",
  "signer-viewed": "signer-viewed-the-contract",
  "delivery-error": "error",
};
const CATALOG = [
  "contract-sent-to-signer",
  "contract-reminder-sent-to-signer",
  "contract-signed",
  "contract-withdrawn",
  "signer-viewed-the-contract",
  "signer-signed",
  "signer-declined",
  "signer-mobile-update-request",
  "sms-incoming",
  "error",
];

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const bodyFor = (status: string) =>
  status === "error"
    ? `{ "status" : "error",
  "data" : { "error_code":"email-delivery-failed",  "error_message":"Mailbox full",
    "contract_id" : "1contr11-2222", "metadata":"ID0001" } }`
    : `{ "status" : "${status}",
  "data" : { "signer" : { "id":"6signer6-9999",  "name":"Sam Signer", "email":"sam@example.com" },
    "contract" : { "id":"1contr11-2222", "title":"Sample NDA", "metadata":"ID0001" } } }`;

const hex = (b: string, secret = SECRET) => createHmac("sha256", secret).update(b).digest("hex");
const b64 = (b: string, secret = SECRET) => createHmac("sha256", secret).update(b).digest("base64");

const trigger = (key: string) => {
  const t = app.triggers.find((x) => x.key === key);
  assert(t !== undefined, `trigger ${key} is declared`);
  return t!;
};

const call = (
  b: string,
  signature: string,
  over: Record<string, unknown> = {},
  params: Record<string, unknown> = { signingSecret: SECRET },
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "x-signature-sha256": signature } as Record<string, string>,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params,
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const ingest = (key: string, input: ReturnType<typeof call>) =>
  trigger(key).handleIngest!(input as never, mockCtx().ctx);

/** Replace the char at `i` with a different one from the same alphabet. */
const flipAt = (s: string, i: number) =>
  s.slice(0, i) + (s[i] === "0" ? "1" : "0") + s.slice(i + 1);

test("the app declares every webhook trigger, with output, sample and a secret param", () => {
  const keys = app.triggers.map((t) => t.key);
  assertEquals(keys, [
    ...Object.keys(STATUS_OF).slice(0, 5),
    ...Object.keys(STATUS_OF).slice(5),
    "new-template",
    "new-template-collaborator",
  ]);
  for (const key of Object.keys(STATUS_OF)) {
    const t = trigger(key);
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(t.params![0].key, "signingSecret");
    assertEquals(t.params![0].type, "secret");
  }
  assertEquals(trigger("contract-event").params!.map((p) => p.key), ["signingSecret", "events"]);
});

for (const [key, status] of Object.entries(STATUS_OF)) {
  const eventStatus = status ?? "signer-viewed-the-contract";
  const BODY = bodyFor(eventStatus);

  test(`${key}: fixture has non-canonical whitespace`, () => {
    assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
  });

  test(`${key}: valid signature (hex and base64) → one event`, async () => {
    for (const sig of [hex(BODY), b64(BODY)]) {
      const out = evs(await ingest(key, call(BODY, sig))) as Array<Record<string, unknown>>;
      assertEquals(out.length, 1);
      assertEquals(out[0].status, eventStatus);
      assertEquals(out[0].contractId, "1contr11-2222");
    }
  });

  test(`${key}: flipping a byte of the SIGNATURE itself (start, middle, end) is refused`, async () => {
    for (const good of [hex(BODY), b64(BODY)]) {
      for (const i of [0, Math.floor(good.length / 2), good.length - 1]) {
        const flipped = flipAt(good, i);
        assert(flipped !== good);
        await assertRejects(() => ingest(key, call(BODY, flipped)), Error, "signature");
      }
    }
  });

  test(`${key}: a flipped byte in the body or another secret is refused`, async () => {
    const forged = BODY.replace("1contr11-2222", "1contr11-2223");
    await assertRejects(() => ingest(key, call(forged, hex(BODY))), Error, "signature");
    await assertRejects(
      () => ingest(key, call(BODY, hex(BODY, "another-secret-value"))),
      Error,
      "signature",
    );
  });

  test(`${key}: header missing or empty → refused`, async () => {
    await assertRejects(
      () => ingest(key, call(BODY, "", { headers: {} })),
      Error,
      "X-Signature-SHA256",
    );
    await assertRejects(() => ingest(key, call(BODY, "")), Error, "X-Signature-SHA256");
  });

  test(`${key}: rawBody absent → refused even with a correct signature`, async () => {
    const c = call(BODY, hex(BODY));
    delete (c.raw as { rawBody?: string }).rawBody;
    await assertRejects(() => ingest(key, c), Error, "raw body");
  });

  test(`${key}: unset or empty secret + absent or empty header → refused`, async () => {
    for (const secret of [undefined, ""]) {
      for (const sig of ["", hex(BODY)]) {
        await assertRejects(
          () => ingest(key, call(BODY, sig, {}, { signingSecret: secret })),
          Error,
          "secret",
        );
      }
    }
  });
}

test("each named trigger keeps only its own status", async () => {
  for (const [key, status] of Object.entries(STATUS_OF)) {
    if (status === null) continue;
    for (const other of CATALOG) {
      if (other === status) continue;
      const b = bodyFor(other);
      assertEquals(evs(await ingest(key, call(b, hex(b)))), [], `${key} ignores ${other}`);
    }
  }
});

test("the delivery-error notification names the contract and carries the error code", async () => {
  const b = bodyFor("error");
  const out = evs(await ingest("delivery-error", call(b, hex(b)))) as Array<
    Record<string, unknown>
  >;
  assertEquals(out[0].contractId, "1contr11-2222");
  assertEquals(out[0].metadata, "ID0001");
  assertEquals((out[0].data as Record<string, unknown>).error_code, "email-delivery-failed");
});

test("Contract Event: empty Events keeps every catalog status; a list keeps only those named", async () => {
  for (const status of CATALOG) {
    const b = bodyFor(status);
    assertEquals(evs(await ingest("contract-event", call(b, hex(b)))).length, 1, status);
    const blank = call(b, hex(b), {}, { signingSecret: SECRET, events: " , " });
    assertEquals(evs(await ingest("contract-event", blank)).length, 1, `${status} (blank filter)`);
  }
  const events = " signer-declined , error ";
  for (const status of CATALOG) {
    const b = bodyFor(status);
    const out = evs(
      await ingest("contract-event", call(b, hex(b), {}, { signingSecret: SECRET, events })),
    );
    assertEquals(out.length, status === "signer-declined" || status === "error" ? 1 : 0, status);
  }
});

test("Contract Event: the filter never lets an unsigned or forged delivery through", async () => {
  const b = bodyFor("signer-declined");
  const params = { signingSecret: SECRET, events: "signer-declined" };
  await assertRejects(() => ingest("contract-event", call(b, "", {}, params)), Error);
  await assertRejects(
    () => ingest("contract-event", call(b, flipAt(hex(b), 10), {}, params)),
    Error,
    "signature",
  );
});

test("errors never contain the secret, the signature or the header value", async () => {
  const b = bodyFor("signer-signed");
  const sig = hex(b, "another-secret-value");
  try {
    await ingest("contract-event", call(b, sig));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(sig));
  }
});

test("a non-POST call is refused", async () => {
  const b = bodyFor("signer-signed");
  await assertRejects(
    () => ingest("contract-event", call(b, hex(b), { method: "GET" })),
    Error,
    "POST",
  );
});

test("onSubscribe makes no vendor call and returns the callback URL; onUnsubscribe is a no-op", async () => {
  for (const key of Object.keys(STATUS_OF)) {
    const t = trigger(key);
    const { ctx, calls } = mockCtx();
    const state = await t.onSubscribe!(
      { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
      ctx,
    );
    assertEquals(state, { callbackUrl: CALLBACK });
    await t.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
    assertEquals(calls.length, 0);
  }
});
