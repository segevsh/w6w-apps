import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import conversation from "../../triggers/conversation-created.ts";
import contact from "../../triggers/contact-created.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "client-secret-value-for-tests-0123";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const body = (topic: string, item: string) =>
  `{ "type" : "notification_event",  "app_id":"abc123",
  "id":"notif_1", "topic":"${topic}", "created_at": 1762683300,
  "data": { "type":"notification_event_data", "item": ${item} } }`;
const CONV = body("conversation.user.created", `{"type":"conversation","id":"215470000000001"}`);
const CONTACT = body("contact.user.created", `{"type":"contact","id":"c1","email":"a@b.test"}`);

const sign = (b: string, secret = SECRET) =>
  "sha1=" + createHmac("sha1", secret).update(b).digest("hex");

const call = (
  b: string,
  over: Record<string, unknown> = {},
  secret: string | undefined | null = SECRET,
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "x-hub-signature": sign(b) } as Record<string, string>,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params: { signingSecret: secret === null ? undefined : secret },
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const ingest = (t: typeof conversation, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(CONV)) !== CONV);
});

test("app declares both original webhook triggers with output and sample", () => {
  const original = app.triggers.filter((t) =>
    t.key === "conversation-created" || t.key === "contact-created"
  );
  assertEquals(original.map((t) => t.key), ["conversation-created", "contact-created"]);
  for (const t of original) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(t.params!.map((p) => p.key), ["signingSecret"]);
  }
});

test("valid signature → one normalized event per topic", async () => {
  const a = evs(await ingest(conversation, call(CONV))) as Array<Record<string, unknown>>;
  assertEquals(a.length, 1);
  assertEquals(a[0].topic, "conversation.user.created");
  assertEquals(a[0].itemId, "215470000000001");
  assertEquals(a[0].notificationId, "notif_1");
  const b = evs(await ingest(contact, call(CONTACT))) as Array<Record<string, unknown>>;
  assertEquals(b[0].itemId, "c1");
});

test("another topic is acknowledged with no event", async () => {
  assertEquals(evs(await ingest(conversation, call(CONTACT))), []);
});

test("one flipped byte in the body → refused", async () => {
  await assertRejects(
    () =>
      ingest(
        conversation,
        call(CONV, { rawBody: CONV.replace("215470000000001", "215470000000002") }),
      ),
    Error,
    "signature",
  );
});

test("signature made with another secret → refused", async () => {
  const c = call(CONV, {
    headers: { "x-hub-signature": sign(CONV, "another-secret-value-xxxxxxxx") },
  });
  await assertRejects(() => ingest(conversation, c), Error, "signature");
});

test("header missing → refused", async () => {
  await assertRejects(
    () => ingest(conversation, call(CONV, { headers: {} })),
    Error,
    "X-Hub-Signature",
  );
});

test("missing sha1= prefix → refused", async () => {
  const bare = createHmac("sha1", SECRET).update(CONV).digest("hex");
  await assertRejects(
    () => ingest(conversation, call(CONV, { headers: { "x-hub-signature": bare } })),
    Error,
  );
});

test("rawBody absent → refused, even with a correct signature", async () => {
  const c = call(CONV);
  delete (c.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(conversation, c), Error, "raw body");
});

test("unset or empty secret + absent or empty header → refused", async () => {
  for (const secret of [null, ""]) {
    for (const headers of [{}, { "x-hub-signature": "" }]) {
      await assertRejects(
        () => ingest(conversation, call(CONV, { headers }, secret)),
        Error,
        "secret",
      );
    }
  }
});

test("errors never contain the secret, the signature or the header value", async () => {
  const sig = sign(CONV, "another-secret-value-xxxxxxxx");
  try {
    await ingest(conversation, call(CONV, { headers: { "x-hub-signature": sig } }));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(sig) && !m.includes(sig.slice(5)));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(() => ingest(conversation, call(CONV, { method: "GET" })), Error, "POST");
});

test("onSubscribe makes no vendor call and returns the callback URL; onUnsubscribe is a no-op", async () => {
  const { ctx, calls } = mockCtx();
  const state = await conversation.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await conversation.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
  assertEquals(calls.length, 0);
});

test("a body with leading and trailing whitespace is verified over the exact bytes", async () => {
  const b = `\n  ${CONV}  \n`;
  const out = evs(await ingest(conversation, call(b, { headers: { "x-hub-signature": sign(b) } })));
  assertEquals(out.length, 1);
  await assertRejects(() =>
    ingest(conversation, call(b, { headers: { "x-hub-signature": sign(b.trim()) } }))
  );
});
