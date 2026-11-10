import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import { envelope, mockCtx } from "../_helpers.ts";
import anyEvent from "../../triggers/any-event.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-signing-secret-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const SUB = { subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" };

// Payload shape from https://cloudconvert.com/api/v2/webhooks (verified 2026-11-10); non-canonical whitespace.
const body = (event: string) =>
  `{ "event" : "${event}",
  "job":{ "id":"4b6ee8e2-e293-4805-b48e-a03876d1ec66", "tag":"invoice-4411",
    "status": "finished", "tasks":[ {"id":"t1","status":"finished"} ] } }`;
const sign = (b: string, secret = SECRET) => createHmac("sha256", secret).update(b).digest("hex");

const call = (
  b: string,
  over: Record<string, unknown> = {},
  state: Record<string, unknown> = {
    webhookId: "9",
    signingSecret: SECRET,
    events: ["job.finished", "job.failed"],
  },
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "cloudconvert-signature": sign(b) } as Record<string, string>,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params: {},
  state,
  subscriptionId: "sub_1",
});
const ingest = (input: ReturnType<typeof call>) =>
  anyEvent.handleIngest!(input as never, mockCtx().ctx);

test("any-event: empty events registers all three documented events (literal POST); the state keeps them", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ id: 9, url: CALLBACK, signing_secret: SECRET }) },
  ]);
  const state = await anyEvent.onSubscribe!({ params: {}, ...SUB }, ctx);
  assertEquals(state, {
    webhookId: "9",
    signingSecret: SECRET,
    events: ["job.created", "job.finished", "job.failed"],
  });
  assertEquals([calls[0].method, calls[0].url], [
    "POST",
    "https://api.cloudconvert.com/v2/webhooks",
  ]);
  assertEquals(JSON.parse(calls[0].body!), {
    url: CALLBACK,
    events: ["job.created", "job.finished", "job.failed"],
  });
});

test("any-event: a chosen events list is registered deduped; an unknown event is refused before any request", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 9, signing_secret: SECRET }) }]);
  await anyEvent.onSubscribe!(
    { params: { events: "job.failed, job.finished,job.failed" }, ...SUB },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).events, ["job.failed", "job.finished"]);
  const none = mockCtx([]);
  await assertRejects(
    () => anyEvent.onSubscribe!({ params: { events: "task.finished" }, ...SUB }, none.ctx),
    Error,
    "Unknown CloudConvert webhook event",
  );
  assertEquals(none.calls.length, 0);
});

test("any-event: with no id or signing secret in the answer the webhook is taken down and it throws", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 9 }) }, { status: 204 }]);
  await assertRejects(
    () => anyEvent.onSubscribe!({ params: {}, ...SUB }, ctx),
    Error,
    "no id or signing secret",
  );
  assertEquals(calls.map((c) => [c.method, c.url]), [
    ["POST", "https://api.cloudconvert.com/v2/webhooks"],
    ["DELETE", "https://api.cloudconvert.com/v2/webhooks/9"],
  ]);
});

test("any-event: onUnsubscribe deletes the stored webhook; 404 and 410 mean gone; no id makes no request", async () => {
  for (const status of [204, 404, 410]) {
    const { ctx, calls } = mockCtx([{ status }]);
    await anyEvent.onUnsubscribe!(
      {
        params: {},
        state: { webhookId: "9", signingSecret: SECRET, events: [] },
        subscriptionId: "s",
      },
      ctx,
    );
    assertEquals([calls[0].method, calls[0].url], [
      "DELETE",
      "https://api.cloudconvert.com/v2/webhooks/9",
    ]);
  }
  const none = mockCtx([]);
  await anyEvent.onUnsubscribe!({ params: {}, state: undefined, subscriptionId: "s" }, none.ctx);
  assertEquals(none.calls.length, 0);
});

test("any-event: a validly signed non-canonical body delivers a registered event and filters the others", async () => {
  const f = body("job.finished");
  assertEquals(JSON.stringify(JSON.parse(f)) !== f, true);
  const out = evs(await ingest(call(f))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].event, "job.finished");
  assertEquals(out[0].jobId, "4b6ee8e2-e293-4805-b48e-a03876d1ec66");
  // job.created is signed and valid but not in the registered list
  assertEquals(evs(await ingest(call(body("job.created")))), []);
});

test("any-event: one flipped byte of the SIGNATURE, a body byte, a missing header, no rawBody are refused", async () => {
  const b = body("job.finished");
  const good = sign(b);
  const flipped = (good[0] === "a" ? "b" : "a") + good.slice(1);
  await assertRejects(
    () => ingest(call(b, { headers: { "cloudconvert-signature": flipped } })),
    Error,
    "signature does not match",
  );
  const last = good.slice(0, -1) + (good.endsWith("0") ? "1" : "0");
  await assertRejects(
    () => ingest(call(b, { headers: { "cloudconvert-signature": last } })),
    Error,
    "signature does not match",
  );
  await assertRejects(
    () => ingest(call(b, { rawBody: b.replace("invoice-4411", "invoice-4412") })),
    Error,
    "signature does not match",
  );
  await assertRejects(() => ingest(call(b, { headers: {} })), Error, "CloudConvert-Signature");
  const noRaw = call(b);
  delete (noRaw.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(noRaw), Error, "raw body");
  await assertRejects(() => ingest(call(b, { method: "GET" })), Error, "POST");
});

test("any-event: an unset or empty signing secret refuses even an empty header", async () => {
  const b = body("job.finished");
  for (const signingSecret of [undefined, "", 5]) {
    await assertRejects(
      () =>
        ingest(
          call(b, { headers: { "cloudconvert-signature": "" } }, {
            webhookId: "9",
            signingSecret,
            events: ["job.finished"],
          } as never),
        ),
      Error,
      "secret",
    );
  }
});

test("any-event: an event outside the registered list is dropped even when the state has none", async () => {
  const b = body("job.finished");
  assertEquals(
    evs(await ingest(call(b, {}, { webhookId: "9", signingSecret: SECRET }))),
    [],
  );
});
