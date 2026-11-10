import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockMoneybirdCtx, pathOf } from "../_helpers.ts";
import app from "../../index.ts";
import trigger from "../../triggers/new-contact.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-secret-for-moneybird-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "administration_id" : "123",  "webhook_id":"77", "entity_type":"Contact",
  "entity_id":"c1", "action":"contact_created",
  "entity": { "id":"c1", "company_name":"Foobar B.V.", "email":"info@example.com",
  "customer_id":"1", "created_at":"2026-11-10T10:00:00.000Z" } }`;

const nowSec = () => Math.floor(Date.now() / 1000);
const sig = (body: string, t: number, secret = SECRET) =>
  `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;

const call = (
  over: Record<string, unknown> = {},
  body = BODY,
  secret: string | null = SECRET,
  header = sig(body, nowSec()),
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "moneybird-signature": header } as Record<string, string>,
    body: JSON.parse(body),
    rawBody: body,
    ...over,
  },
  params: {},
  state: { administrationId: "123", webhookId: "77", secret: secret ?? undefined },
  subscriptionId: "sub_1",
});
const ingest = (input: ReturnType<typeof call>) =>
  trigger.handleIngest!(input, mockMoneybirdCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares the contact webhook beside the two polls, with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "new-sales-invoice",
    "new-or-updated-sales-invoice",
    "new-contact",
  ]);
  assert(trigger.output!.length > 0);
  assert(trigger.sample !== undefined);
  assertEquals(trigger.poll, undefined);
  assertEquals(typeof trigger.onSubscribe, "function");
  assertEquals(typeof trigger.onUnsubscribe, "function");
});

test("valid signature → one normalized contact event", async () => {
  const out = evs(await ingest(call())) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].contactId, "c1");
  assertEquals(out[0].companyName, "Foobar B.V.");
  assertEquals(out[0].action, "contact_created");
  assertEquals(out[0].administrationId, "123");
});

test("any one v1 digest may match (secret rotation), unknown schemes are ignored", async () => {
  const t = nowSec();
  const good = sig(BODY, t).split(",")[1];
  const other = `v1=${
    createHmac("sha256", "old-secret-value").update(`${t}.${BODY}`).digest("hex")
  }`;
  const h = `t=${t},${other},v2=abcdef,${good}`;
  assertEquals(evs(await ingest(call({ headers: { "moneybird-signature": h } }))).length, 1);
});

test("another action is acknowledged with no event", async () => {
  const b = BODY.replace("contact_created", "contact_updated");
  assertEquals(evs(await ingest(call({}, b, SECRET, sig(b, nowSec())))), []);
});

test("one flipped byte in the body → refused", async () => {
  await assertRejects(
    () => ingest(call({ rawBody: BODY.replace('"c1"', '"c2"') })),
    Error,
    "signature",
  );
});

test("signature made with another secret → refused", async () => {
  const c = call({}, BODY, SECRET, sig(BODY, nowSec(), "another-secret-value-xxxxxxxx"));
  await assertRejects(() => ingest(c), Error, "signature");
});

test("a signature over the body alone (timestamp not signed in) → refused", async () => {
  const bare = createHmac("sha256", SECRET).update(BODY).digest("hex");
  await assertRejects(
    () => ingest(call({}, BODY, SECRET, `t=${nowSec()},v1=${bare}`)),
    Error,
    "signature",
  );
});

test("header missing or malformed → refused", async () => {
  await assertRejects(() => ingest(call({ headers: {} })), Error, "Moneybird-Signature");
  await assertRejects(
    () => ingest(call({ headers: { "moneybird-signature": "garbage" } })),
    Error,
    "malformed",
  );
  await assertRejects(
    () => ingest(call({ headers: { "moneybird-signature": `t=${nowSec()}` } })),
    Error,
    "malformed",
  );
});

test("rawBody absent → refused, even with a correct signature", async () => {
  const c = call();
  delete (c.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(c), Error, "raw body");
});

test("unset or empty secret + absent or empty header → refused", async () => {
  for (const secret of [null, ""]) {
    for (const headers of [{}, { "moneybird-signature": "" }]) {
      await assertRejects(() => ingest(call({ headers }, BODY, secret)), Error, "secret");
    }
  }
});

test("stale or future timestamp (correctly signed) → refused", async () => {
  for (const t of [nowSec() - 3600, nowSec() + 3600]) {
    await assertRejects(
      () => ingest(call({}, BODY, SECRET, sig(BODY, t))),
      Error,
      "five minutes",
    );
  }
  const near = nowSec() - 200;
  assertEquals(evs(await ingest(call({}, BODY, SECRET, sig(BODY, near)))).length, 1);
});

test("errors never contain the secret, the digest or the header value", async () => {
  const h = sig(BODY, nowSec(), "another-secret-value-xxxxxxxx");
  try {
    await ingest(call({}, BODY, SECRET, h));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(h) && !m.includes(h.split("v1=")[1]));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(() => ingest(call({ method: "GET" })), Error, "POST");
});

test("onSubscribe POSTs the literal webhook body and keeps id and secret", async () => {
  const { ctx, calls } = mockMoneybirdCtx([
    { status: 201, body: { id: "503", administration_id: 123, secret: SECRET } },
  ]);
  const state = await trigger.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { administrationId: "123", webhookId: "503", secret: SECRET });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/123/webhooks.json");
  assertEquals(JSON.parse(calls[0].body!), { url: CALLBACK, enabled_events: ["contact_created"] });
});

test("onSubscribe without a returned secret rolls the webhook back and fails", async () => {
  const { ctx, calls } = mockMoneybirdCtx([
    { status: 201, body: { id: "503" } },
    { status: 204 },
  ]);
  await assertRejects(
    () =>
      trigger.onSubscribe!(
        { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "signing secret",
  );
  assertEquals(calls[1].method, "DELETE");
  assertEquals(pathOf(calls[1].url), "/api/v2/123/webhooks/503.json");
});

test("onUnsubscribe DELETEs the webhook; 404 and 410 are already gone; 500 surfaces", async () => {
  const state = { administrationId: "123", webhookId: "503", secret: SECRET };
  const ok = mockMoneybirdCtx([{ status: 204 }]);
  await trigger.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, ok.ctx);
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(pathOf(ok.calls[0].url), "/api/v2/123/webhooks/503.json");
  for (const status of [404, 410]) {
    const gone = mockMoneybirdCtx([{ status, body: { error: "not found" } }]);
    await trigger.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, gone.ctx);
  }
  const bad = mockMoneybirdCtx([{ status: 500, body: { error: "boom" } }]);
  await assertRejects(
    () => trigger.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, bad.ctx),
    Error,
    "500",
  );
});
