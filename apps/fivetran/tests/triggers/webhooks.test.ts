import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import syncEnded from "../../triggers/sync-ended.ts";
import syncStarted from "../../triggers/sync-started.ts";
import connectionFailure from "../../triggers/connection-failure.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "webhook-secret-for-tests-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const body = (event = "sync_end") =>
  `{ "event" : "${event}",  "created":"2026-11-10T09:30:00.386Z",
  "connector_type":"postgres", "connector_id":"mystified_presiding",
  "connector_name":"mystified_presiding", "sync_id":"sync_1",
  "destination_group_id":"deck_enjoy",
  "data": { "status" : "SUCCESSFUL" } }`;

const sign = (b: string, secret = SECRET) => createHmac("sha256", secret).update(b).digest("hex");

const call = (
  b: string,
  over: Record<string, unknown> = {},
  secret: string | undefined | null = SECRET,
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "x-fivetran-signature-256": sign(b) } as Record<string, string>,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params: {},
  state: secret === null ? {} : { webhookId: "wh_1", secret },
  subscriptionId: "sub_1",
});

const ingest = (t: typeof syncEnded, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(body())) !== body());
});

test("app declares the poll trigger plus three webhook triggers with output and sample", () => {
  assertEquals(app.triggers.slice(0, 4).map((t) => t.key), [
    "new-connection",
    "sync-started",
    "sync-ended",
    "connection-failure",
  ]);
  for (const t of app.triggers.slice(1, 4)) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
  }
});

test("valid signature → one normalized event", async () => {
  const out = evs(await ingest(syncEnded, call(body()))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].event, "sync_end");
  assertEquals(out[0].connectorId, "mystified_presiding");
  assertEquals(out[0].syncId, "sync_1");
  assertEquals(out[0].destinationGroupId, "deck_enjoy");
  assertEquals(out[0].data, { status: "SUCCESSFUL" });
});

test("the signature is accepted in upper case too (Fivetran's own examples upper-case it)", async () => {
  const b = body();
  const c = call(b, { headers: { "x-fivetran-signature-256": sign(b).toUpperCase() } });
  assertEquals(evs(await ingest(syncEnded, c)).length, 1);
});

test("another event is acknowledged with no event", async () => {
  assertEquals(evs(await ingest(syncStarted, call(body("sync_end")))), []);
  assertEquals(evs(await ingest(connectionFailure, call(body("sync_end")))), []);
  assertEquals(evs(await ingest(syncStarted, call(body("sync_start")))).length, 1);
});

test("one flipped byte in the body → refused", async () => {
  const b = body();
  await assertRejects(
    () => ingest(syncEnded, call(b, { rawBody: b.replace("sync_1", "sync_2") })),
    Error,
    "signature",
  );
});

test("signature made with another secret → refused", async () => {
  const b = body();
  await assertRejects(
    () =>
      ingest(
        syncEnded,
        call(b, {
          headers: { "x-fivetran-signature-256": sign(b, "another-secret-value-xxxxxxxx") },
        }),
      ),
    Error,
    "signature",
  );
});

test("header missing → refused", async () => {
  await assertRejects(
    () => ingest(syncEnded, call(body(), { headers: {} })),
    Error,
    "X-Fivetran-Signature-256",
  );
});

test("rawBody absent → refused, even with a correct signature", async () => {
  const c = call(body());
  delete (c.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(syncEnded, c), Error, "raw body");
});

test("unset or empty secret + absent or empty header → refused", async () => {
  for (const secret of [null, ""]) {
    for (const headers of [{}, { "x-fivetran-signature-256": "" }]) {
      await assertRejects(
        () => ingest(syncEnded, call(body(), { headers }, secret)),
        Error,
        "secret",
      );
    }
  }
});

test("errors never contain the secret, the signature or the header value", async () => {
  const b = body();
  const sig = sign(b, "another-secret-value-xxxxxxxx");
  try {
    await ingest(syncEnded, call(b, { headers: { "x-fivetran-signature-256": sig } }));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(sig));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(() => ingest(syncEnded, call(body(), { method: "GET" })), Error, "POST");
});

test("a signed body that is not a Fivetran event → refused", async () => {
  await assertRejects(
    () => ingest(syncEnded, call(`{ "hello" : "world" }`)),
    Error,
    "Not a Fivetran",
  );
});

test("onSubscribe POSTs an account webhook with a random secret and keeps it in state", async () => {
  const { ctx, calls } = mockCtx([{
    body: { code: "Success", data: { id: "wh_9", type: "account" } },
  }]);
  const state = await syncEnded.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  ) as { webhookId: string; secret: string };
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/webhooks/account");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.url, CALLBACK);
  assertEquals(sent.events, ["sync_end"]);
  assertEquals(sent.active, true);
  assert(typeof sent.secret === "string" && sent.secret.length >= 32);
  assertEquals(state, { webhookId: "wh_9", secret: sent.secret });
});

test("every subscription gets its own random secret", async () => {
  const secrets = new Set<string>();
  for (const subscriptionId of ["sub_1", "sub_2", "sub_3"]) {
    const { ctx } = mockCtx([{ body: { data: { id: `wh_${subscriptionId}` } } }]);
    const state = await syncEnded.onSubscribe!(
      { params: {}, subscriptionId, callbackUrl: CALLBACK, hostUrl: "" },
      ctx,
    ) as { secret: string };
    secrets.add(state.secret);
  }
  assertEquals(secrets.size, 3);
});

test("onSubscribe with a destination uses the group path and the trigger's own event", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "wh_9" } } }]);
  await syncStarted.onSubscribe!(
    {
      params: { groupId: " deck_enjoy " },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v1/webhooks/group/deck_enjoy");
  assertEquals(JSON.parse(calls[0].body!).events, ["sync_start"]);
});

test("onSubscribe refuses an answer without a webhook id", async () => {
  const { ctx } = mockCtx([{ body: { data: {} } }]);
  await assertRejects(
    () =>
      syncEnded.onSubscribe!(
        { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "id of the webhook",
  );
});

test("onUnsubscribe DELETEs the webhook; 404 and 410 are already gone; 500 propagates", async () => {
  const state = { webhookId: "wh_9", secret: "s" };
  const ok = mockCtx([{ body: { code: "Success" } }]);
  await syncEnded.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, ok.ctx);
  assertEquals(ok.calls.length, 1);
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(new URL(ok.calls[0].url).pathname, "/v1/webhooks/wh_9");
  for (const status of [404, 410]) {
    const gone = mockCtx([{ status, body: { code: "NotFound", message: "no webhook" } }]);
    await syncEnded.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, gone.ctx);
    assertEquals(gone.calls.length, 1);
  }
  const boom = mockCtx([{ status: 500, body: { message: "boom" } }]);
  await assertRejects(() =>
    syncEnded.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, boom.ctx)
  );
});

test("onUnsubscribe with no stored webhook makes no call", async () => {
  const { ctx, calls } = mockCtx();
  await syncEnded.onUnsubscribe!({ params: {}, state: {}, subscriptionId: "s" }, ctx);
  assertEquals(calls.length, 0);
});
