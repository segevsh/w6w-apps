import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import documentCompleted from "../../triggers/document-completed.ts";
import documentSigned from "../../triggers/document-signed.ts";
import documentEvent from "../../triggers/document-event.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const HOOK_ID = "3ca1189b-ae29-4a9e-878d-5c53dee86987";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const NOW = Math.floor(Date.now() / 1000);

const hash = (type: string, time: number | string, key = HOOK_ID) =>
  createHmac("sha256", key).update(`${type}@${time}`).digest("hex");

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const body = (
  over: { type?: string; time?: number; hash?: string; signer?: boolean } = {},
) => {
  const type = over.type ?? "document_completed";
  const time = over.time ?? NOW;
  return `{ "event" : { "hash":"${over.hash ?? hash(type, time)}",  "time": ${time},
    "type":"${type}"${
    over.signer
      ? `, "related_signer": { "email": " ada@example.com ", "name": "Ada Lovelace" }`
      : ""
  } },
  "data": { "object": { "id":"doc-1", "name":"Example contract",
    "status":"Completed", "recipients": [ ] }, "account_id":"acct-1" } }`;
};

const call = (
  b: string | null,
  over: Record<string, unknown> = {},
  state: unknown = { webhookId: HOOK_ID },
  params: Record<string, unknown> = {},
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: {} as Record<string, string>,
    body: b === null ? null : JSON.parse(b),
    ...(b === null ? {} : { rawBody: b }),
    ...over,
  },
  params,
  state,
  subscriptionId: "sub_1",
});

const ingest = (t: typeof documentCompleted, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  const b = body();
  assert(JSON.stringify(JSON.parse(b)) !== b);
});

test("app declares the three webhook triggers with output and sample, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "document-completed",
    "document-signed",
    "document-event",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
    assertEquals(typeof t.handleIngest, "function");
  }
});

test("valid hash (node:crypto) → one normalized event", async () => {
  const out = evs(await ingest(documentCompleted, call(body()))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].type, "document_completed");
  assertEquals(out[0].time, NOW);
  assertEquals(out[0].objectId, "doc-1");
  assertEquals(out[0].name, "Example contract");
  assertEquals(out[0].status, "Completed");
  assertEquals(out[0].accountId, "acct-1");
  assertEquals(out[0].relatedSigner, null);
});

test("document-signed carries the signer", async () => {
  const b = body({ type: "document_signed", signer: true });
  const out = evs(await ingest(documentSigned, call(b))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].relatedSigner, { name: "Ada Lovelace", email: "ada@example.com" });
});

test("a verified event the trigger was not asked for is acknowledged without a run", async () => {
  assertEquals(evs(await ingest(documentCompleted, call(body({ type: "document_sent" })))), []);
  assertEquals(evs(await ingest(documentSigned, call(body()))), []);
});

test("document-event: all events by default, only the chosen ones when events is set", async () => {
  const viewed = body({ type: "document_viewed" });
  assertEquals(evs(await ingest(documentEvent, call(viewed))).length, 1);
  assertEquals(
    evs(await ingest(documentEvent, call(viewed, {}, undefined, { events: "document_sent" }))),
    [],
  );
  assertEquals(
    evs(
      await ingest(
        documentEvent,
        call(viewed, {}, undefined, { events: "document_sent, Document_Viewed" }),
      ),
    ).length,
    1,
  );
});

test("one flipped byte in the hash → throws, echoing neither the hash nor the webhook id", async () => {
  const good = hash("document_completed", NOW);
  const bad = good.slice(0, -1) + (good.endsWith("0") ? "1" : "0");
  const err = await assertRejects(() =>
    ingest(documentCompleted, call(body({ hash: bad }))) as Promise<unknown>
  );
  assert(!err.message.includes(bad));
  assert(!err.message.includes(good));
  assert(!err.message.includes(HOOK_ID));
});

test("a hash made with another key → throws", async () => {
  await assertRejects(() =>
    ingest(
      documentCompleted,
      call(body({ hash: hash("document_completed", NOW, "another-webhook-id") })),
    ) as Promise<unknown>
  );
});

test("the hash covers the type: a signed document_sent cannot be replayed as document_completed", async () => {
  await assertRejects(() =>
    ingest(
      documentCompleted,
      call(body({ type: "document_completed", hash: hash("document_sent", NOW) })),
    ) as Promise<unknown>
  );
});

test("hash missing → throws", async () => {
  const b = body().replace(/"hash":"[0-9a-f]+",/, "");
  assert(!b.includes('"hash"'));
  await assertRejects(() => ingest(documentCompleted, call(b)) as Promise<unknown>);
});

test("rawBody absent → throws (never re-serialises the parsed body)", async () => {
  const input = call(body());
  delete (input.raw as { rawBody?: string }).rawBody;
  assert(input.raw.body !== null);
  const err = await assertRejects(() => ingest(documentCompleted, input) as Promise<unknown>);
  assert(/raw body/i.test(err.message));
});

test("empty, missing or non-string webhook id in state → throws before any compare", async () => {
  for (const state of [{ webhookId: "" }, {}, null, { webhookId: 7 }]) {
    const err = await assertRejects(() =>
      ingest(documentCompleted, call(body(), {}, state)) as Promise<unknown>
    );
    assert(/secret/i.test(err.message));
  }
});

test("stale event time (outside five minutes, either side) → throws even with a valid hash", async () => {
  for (const time of [NOW - 301 - 5, NOW + 301 + 5]) {
    const err = await assertRejects(() =>
      ingest(documentCompleted, call(body({ time }))) as Promise<unknown>
    );
    assert(/window/i.test(err.message));
  }
  // just inside the window still verifies
  assertEquals(evs(await ingest(documentCompleted, call(body({ time: NOW - 290 })))).length, 1);
});

test("a non-JSON body or a non-POST method → throws", async () => {
  const bad = call(body(), { rawBody: "not json" });
  await assertRejects(() => ingest(documentCompleted, bad) as Promise<unknown>);
  await assertRejects(() =>
    ingest(documentCompleted, call(body(), { method: "GET" })) as Promise<unknown>
  );
});

test("onSubscribe POSTs the callback URL to /hooks and keeps the webhook id", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: HOOK_ID, callback_url: CALLBACK },
  }]);
  const state = await documentCompleted.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { webhookId: HOOK_ID });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/hooks");
  assertEquals(JSON.parse(calls[0].body!), { callback_url: CALLBACK });
});

test("onSubscribe refuses an unknown event name before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() =>
    Promise.resolve(documentEvent.onSubscribe!(
      {
        params: { events: "document_made_up" },
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "",
      },
      ctx,
    ))
  );
  assertEquals(calls.length, 0);
});

test("onSubscribe fails when SignWell returns no id", async () => {
  const { ctx } = mockCtx([{ status: 201, body: { callback_url: CALLBACK } }]);
  await assertRejects(() =>
    Promise.resolve(documentCompleted.onSubscribe!(
      { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
      ctx,
    ))
  );
});

test("onUnsubscribe DELETEs /hooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await documentCompleted.onUnsubscribe!(
    { params: {}, state: { webhookId: HOOK_ID }, subscriptionId: "sub_1" },
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `https://www.signwell.com/api/v1/hooks/${HOOK_ID}`);
});

test("onUnsubscribe: 404 = already gone; any other error propagates; no state = no call", async () => {
  const gone = mockCtx([{
    status: 404,
    body: { message: "Not found", meta: { error: "not_found" } },
  }]);
  await documentCompleted.onUnsubscribe!(
    { params: {}, state: { webhookId: HOOK_ID }, subscriptionId: "s" },
    gone.ctx,
  );
  const boom = mockCtx([{ status: 500, body: { message: "boom" } }]);
  await assertRejects(() =>
    Promise.resolve(documentCompleted.onUnsubscribe!(
      { params: {}, state: { webhookId: HOOK_ID }, subscriptionId: "s" },
      boom.ctx,
    ))
  );
  const none = mockCtx([]);
  await documentCompleted.onUnsubscribe!(
    { params: {}, state: undefined, subscriptionId: "s" },
    none.ctx,
  );
  assertEquals(none.calls.length, 0);
});
