import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import newItem from "../../triggers/new-webset-item.ts";
import enriched from "../../triggers/webset-item-enriched.ts";

/** Expect `fn` to reject with an Error whose message contains `includes` (when given). */
async function assertRejects(
  fn: () => Promise<unknown>,
  _kind: ErrorConstructor = Error,
  includes?: string,
): Promise<void> {
  try {
    await fn();
  } catch (e) {
    assert(e instanceof Error, "must reject with an Error");
    if (includes) assert(e.message.includes(includes), `message lacks "${includes}": ${e.message}`);
    return;
  }
  assert(false, "must reject");
}

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "webhook-secret-for-tests-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const NOW = Math.floor(Date.now() / 1000);

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const body = (type = "webset.item.created", websetId = "webset_A") =>
  `{ "id":"event_1",  "object" : "event", "type":"${type}",
  "data": { "id":"witem_1", "object":"webset_item", "websetId":"${websetId}",
    "properties": { "type":"company", "url":"https://example.com" } },
  "createdAt":"2026-11-10T09:30:00.000Z" }`;

const sign = (ts: number | string, b: string, secret = SECRET) =>
  createHmac("sha256", secret).update(`${ts}.${b}`).digest("hex");
const hdr = (ts: number | string, b: string, secret = SECRET) =>
  `t=${ts},v1=${sign(ts, b, secret)}`;

const call = (
  b: string,
  over: Record<string, unknown> = {},
  secret: string | undefined | null = SECRET,
  websetId?: string,
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "exa-signature": hdr(NOW, b) } as Record<string, string>,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params: websetId ? { websetId } : {},
  state: secret === null ? {} : { webhookId: "wh_1", secret },
  subscriptionId: "sub_1",
});

const ingest = (t: typeof newItem, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(body())) !== body());
});

test("app declares both webhook triggers with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), ["new-webset-item", "webset-item-enriched"]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
  }
});

test("valid signature → one normalized event", async () => {
  const out = evs(await ingest(newItem, call(body()))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].eventId, "event_1");
  assertEquals(out[0].type, "webset.item.created");
  assertEquals(out[0].websetId, "webset_A");
  assertEquals(out[0].itemId, "witem_1");
  assertEquals((out[0].data as Record<string, unknown>).object, "webset_item");
});

test("a second v1 entry may carry the match", async () => {
  const b = body();
  const h = `t=${NOW},v1=${"0".repeat(64)},v1=${sign(NOW, b)}`;
  assertEquals(evs(await ingest(newItem, call(b, { headers: { "exa-signature": h } }))).length, 1);
});

test("another event type is acknowledged with no event", async () => {
  const b = body("webset.item.enriched");
  assertEquals(evs(await ingest(newItem, call(b))), []);
  assertEquals(evs(await ingest(enriched, call(b))).length, 1);
});

test("the websetId filter drops other Websets' events", async () => {
  assertEquals(evs(await ingest(newItem, call(body(), {}, SECRET, "webset_B"))), []);
  assertEquals(evs(await ingest(newItem, call(body(), {}, SECRET, "webset_A"))).length, 1);
});

test("one flipped byte in the body → refused", async () => {
  const b = body();
  await assertRejects(
    () => ingest(newItem, call(b, { rawBody: b.replace("witem_1", "witem_2") })),
    Error,
    "signature",
  );
});

test("signature made with another secret → refused", async () => {
  const b = body();
  await assertRejects(
    () =>
      ingest(
        newItem,
        call(b, { headers: { "exa-signature": hdr(NOW, b, "another-secret-value-xxxxxxxx") } }),
      ),
    Error,
    "signature",
  );
});

test("header missing or without a v1 entry → refused", async () => {
  await assertRejects(() => ingest(newItem, call(body(), { headers: {} })), Error, "Exa-Signature");
  await assertRejects(
    () => ingest(newItem, call(body(), { headers: { "exa-signature": `t=${NOW}` } })),
    Error,
    "malformed",
  );
});

test("rawBody absent → refused, even with a correct signature", async () => {
  const c = call(body());
  delete (c.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(newItem, c), Error, "raw body");
});

test("unset or empty secret + absent or empty header → refused", async () => {
  for (const secret of [null, ""]) {
    for (const headers of [{}, { "exa-signature": "" }]) {
      await assertRejects(
        () => ingest(newItem, call(body(), { headers }, secret)),
        Error,
        "secret",
      );
    }
  }
});

test("a stale timestamp (even correctly signed) → refused; a fresh one inside the window passes", async () => {
  const b = body();
  const old = NOW - 301;
  await assertRejects(
    () => ingest(newItem, call(b, { headers: { "exa-signature": hdr(old, b) } })),
    Error,
    "window",
  );
  const edge = NOW - 120;
  assertEquals(
    evs(await ingest(newItem, call(b, { headers: { "exa-signature": hdr(edge, b) } }))).length,
    1,
  );
});

test("errors never contain the secret, the signature or the header value", async () => {
  const b = body();
  const h = hdr(NOW, b, "another-secret-value-xxxxxxxx");
  try {
    await ingest(newItem, call(b, { headers: { "exa-signature": h } }));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(h) && !m.includes(h.split("v1=")[1]));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(() => ingest(newItem, call(body(), { method: "GET" })), Error, "POST");
});

test("a signed body that is not an Exa event → refused", async () => {
  const b = `{ "hello" : "world" }`;
  await assertRejects(() => ingest(newItem, call(b)), Error, "Not an Exa");
});

test("onSubscribe POSTs the webhook (events + url) and keeps id and secret in state", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "wh_9", object: "webhook", secret: "s3cret-from-exa" },
  }]);
  const state = await newItem.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { webhookId: "wh_9", secret: "s3cret-from-exa" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/websets/v0/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    events: ["webset.item.created"],
    url: CALLBACK,
    metadata: { source: "w6w", subscription: "sub_1" },
  });
});

test("onSubscribe subscribes the enriched trigger to its own event", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wh_9", secret: "s3cret-from-exa" } }]);
  await enriched.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).events, ["webset.item.enriched"]);
});

test("onSubscribe without a returned secret deletes the webhook and refuses", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wh_9" } }, { body: {} }]);
  await assertRejects(
    () =>
      newItem.onSubscribe!(
        { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "signing secret",
  );
  assertEquals(calls.map((c) => c.method), ["POST", "DELETE"]);
  assertEquals(new URL(calls[1].url).pathname, "/websets/v0/webhooks/wh_9");
});

test("onUnsubscribe DELETEs the webhook; 404 and 410 are already gone; 500 propagates", async () => {
  const state = { webhookId: "wh_9", secret: "s" };
  const ok = mockCtx([{ body: {} }]);
  await newItem.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, ok.ctx);
  assertEquals(ok.calls.length, 1);
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(new URL(ok.calls[0].url).pathname, "/websets/v0/webhooks/wh_9");
  for (const status of [404, 410]) {
    const gone = mockCtx([{ status, body: { error: "not found", tag: "NOT_FOUND" } }]);
    await newItem.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, gone.ctx);
    assertEquals(gone.calls.length, 1);
  }
  const boom = mockCtx([{ status: 500, body: { error: "boom" } }]);
  await assertRejects(() =>
    newItem.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, boom.ctx)
  );
});

test("onUnsubscribe with no stored webhook makes no call", async () => {
  const { ctx, calls } = mockCtx();
  await newItem.onUnsubscribe!({ params: {}, state: {}, subscriptionId: "s" }, ctx);
  assertEquals(calls.length, 0);
});
