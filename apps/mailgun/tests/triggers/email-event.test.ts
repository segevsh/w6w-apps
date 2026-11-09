import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import trigger from "../../triggers/email-event.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const KEY = "webhook-signing-key-for-tests-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const NOW = Math.floor(Date.now() / 1000);

const sig = (ts: string, token: string, key = KEY) =>
  createHmac("sha256", key).update(ts + token).digest("hex");

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const jsonBody = (
  over: { ts?: string; token?: string; signature?: string; event?: string } = {},
) => {
  const ts = over.ts ?? String(NOW);
  const token = over.token ?? "tok0123456789abcdef";
  return `{ "signature" : { "timestamp": "${ts}",  "token":"${token}",
    "signature":"${over.signature ?? sig(ts, token)}" },
  "event-data": { "event":"${over.event ?? "delivered"}", "id":"EVT1", "timestamp": ${ts}.5,
    "recipient":"ada@example.com", "tags":["welcome"],
    "message": { "headers": { "message-id":"m1@mg.example.com" } } } }`;
};

const call = (
  b: string | null,
  over: Record<string, unknown> = {},
  key: string | undefined | null = KEY,
  events?: string,
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
  params: { domain: "mg.example.com", signingKey: key === null ? undefined : key, events },
  state: { domain: "mg.example.com", hooks: ["delivered"] },
  subscriptionId: "sub_1",
});

const ingest = (input: ReturnType<typeof call>) => trigger.handleIngest!(input, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  const b = jsonBody();
  assert(JSON.stringify(JSON.parse(b)) !== b);
});

test("app declares the webhook trigger with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), ["email-event"]);
  assert(trigger.output!.length > 0);
  assert(trigger.sample !== undefined);
  assertEquals(trigger.poll, undefined);
  assertEquals(typeof trigger.onSubscribe, "function");
  assertEquals(typeof trigger.onUnsubscribe, "function");
});

test("valid signature (node:crypto) → one normalized event", async () => {
  const out = evs(await ingest(call(jsonBody()))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].event, "delivered");
  assertEquals(out[0].recipient, "ada@example.com");
  assertEquals(out[0].eventId, "EVT1");
  assertEquals(out[0].messageId, "m1@mg.example.com");
  assertEquals(out[0].tags, ["welcome"]);
});

test("legacy form-encoded delivery with a valid signature → event; bounced maps to failed", async () => {
  const ts = String(NOW);
  const form = new URLSearchParams({
    event: "bounced",
    recipient: "x@example.com",
    domain: "mg.example.com",
    timestamp: ts,
    token: "legacytoken0123456",
    signature: sig(ts, "legacytoken0123456"),
  }).toString();
  const out = evs(await ingest(call(null, { rawBody: form, body: null }, KEY, "failed"))) as Array<
    Record<string, unknown>
  >;
  assertEquals(out[0].event, "failed");
  assertEquals(out[0].recipient, "x@example.com");
});

test("an event outside the chosen list is acknowledged with no event", async () => {
  assertEquals(
    evs(await ingest(call(jsonBody({ event: "opened" }), {}, KEY, "delivered,clicked"))),
    [],
  );
});

test("signature made with another key → refused", async () => {
  const ts = String(NOW);
  const bad = sig(ts, "tok0123456789abcdef", "another-key-value-xxxxxxxxxxxxxxxx");
  await assertRejects(() => ingest(call(jsonBody({ signature: bad }))), Error, "signature");
});

test("one flipped byte in the token → refused", async () => {
  const b = jsonBody();
  await assertRejects(
    () => ingest(call(b, { rawBody: b.replace("tok0123456789abcdef", "tok0123456789abcdee") })),
    Error,
    "signature",
  );
});

test("one flipped byte in the signature → refused", async () => {
  const good = sig(String(NOW), "tok0123456789abcdef");
  const flipped = (good[0] === "0" ? "1" : "0") + good.slice(1);
  await assertRejects(() => ingest(call(jsonBody({ signature: flipped }))), Error, "signature");
});

test("signature object missing or incomplete → refused", async () => {
  const noSig = `{ "event-data": { "event": "delivered" } }`;
  await assertRejects(() => ingest(call(noSig)), Error, "signature object");
  const partial =
    `{ "signature": { "timestamp": "${NOW}", "token": "t" }, "event-data": {"event":"delivered"} }`;
  await assertRejects(() => ingest(call(partial)), Error, "signature object");
});

test("stale or future timestamp → refused even with a valid signature over it", async () => {
  for (const delta of [-301, -86400, 301, 86400]) {
    const ts = String(NOW + delta);
    await assertRejects(() => ingest(call(jsonBody({ ts }))), Error, "window");
  }
  // inside the window still passes
  assertEquals(
    (evs(await ingest(call(jsonBody({ ts: String(NOW - 200) })))) as unknown[]).length,
    1,
  );
});

test("rawBody absent → refused", async () => {
  await assertRejects(() => ingest(call(null)), Error, "raw body");
});

test("unset or empty signing key → refused", async () => {
  for (const key of [null, ""]) {
    await assertRejects(() => ingest(call(jsonBody(), {}, key)), Error, "secret");
  }
});

test("errors never contain the key, the signature or the token", async () => {
  const bad = sig(String(NOW), "tok0123456789abcdef", "another-key-value-xxxxxxxxxxxxxxxx");
  for (const b of [jsonBody({ signature: bad }), jsonBody({ ts: String(NOW - 9999) })]) {
    try {
      await ingest(call(b));
      assert(false, "must throw");
    } catch (e) {
      const m = (e as Error).message;
      assert(!m.includes(KEY) && !m.includes(bad) && !m.includes("tok0123456789abcdef"));
    }
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(() => ingest(call(jsonBody(), { method: "GET" })), Error, "POST");
});

test("onSubscribe POSTs one form per hook to the domain's webhooks path and keeps them in state", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }, { body: { message: "ok" } }]);
  const state = await trigger.onSubscribe!(
    {
      params: { domain: "mg.example.com", events: "delivered,failed" },
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    ctx,
  );
  assertEquals(state, { domain: "mg.example.com", hooks: ["delivered", "permanent_fail"] });
  assertEquals(calls.length, 2);
  assertEquals(calls.map((c) => c.method), ["POST", "POST"]);
  assertEquals(new URL(calls[0].url).pathname, "/v3/domains/mg.example.com/webhooks");
  assertEquals(calls[0].body, new URLSearchParams({ id: "delivered", url: CALLBACK }).toString());
  assertEquals(
    calls[1].body,
    new URLSearchParams({ id: "permanent_fail", url: CALLBACK }).toString(),
  );
});

test("onSubscribe uses the EU host for an EU connection", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { connection: { display: { region: "eu" } } });
  await trigger.onSubscribe!(
    {
      params: { domain: "mg.example.com", events: "opened" },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    ctx,
  );
  assertEquals(new URL(calls[0].url).host, "api.eu.mailgun.net");
});

test("onSubscribe rolls back created hooks when a later one fails, then rethrows", async () => {
  const { ctx, calls } = mockCtx([
    { body: {} },
    { status: 400, body: { message: "Webhook already exists" } },
    { status: 200, body: {} },
  ]);
  await assertRejects(
    () =>
      trigger.onSubscribe!(
        {
          params: { domain: "mg.example.com", events: "delivered,opened" },
          subscriptionId: "s",
          callbackUrl: CALLBACK,
          hostUrl: "",
        },
        ctx,
      ),
    Error,
    "400",
  );
  assertEquals(calls.length, 3);
  assertEquals(calls[2].method, "DELETE");
  assertEquals(new URL(calls[2].url).pathname, "/v3/domains/mg.example.com/webhooks/delivered");
});

test("onSubscribe validates domain and events before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      trigger.onSubscribe!({
        params: { domain: " " },
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "",
      }, ctx),
    Error,
    "domain",
  );
  await assertRejects(
    () =>
      trigger.onSubscribe!({
        params: { domain: "d.test", events: "nope" },
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "",
      }, ctx),
    Error,
    "Unknown",
  );
  assertEquals(calls.length, 0);
});

test("onUnsubscribe DELETEs each hook; 404 is already gone; 500 propagates", async () => {
  const state = { domain: "mg.example.com", hooks: ["delivered", "opened"] };
  const ok = mockCtx([{ body: {} }, { body: {} }]);
  await trigger.onUnsubscribe!(
    { params: { domain: "mg.example.com" }, state, subscriptionId: "s" },
    ok.ctx,
  );
  assertEquals(ok.calls.map((c) => c.method), ["DELETE", "DELETE"]);
  assertEquals(new URL(ok.calls[1].url).pathname, "/v3/domains/mg.example.com/webhooks/opened");
  const gone = mockCtx([{ status: 404, body: { message: "not found" } }, {
    status: 404,
    body: {},
  }]);
  await trigger.onUnsubscribe!(
    { params: { domain: "mg.example.com" }, state, subscriptionId: "s" },
    gone.ctx,
  );
  assertEquals(gone.calls.length, 2);
  const boom = mockCtx([{ status: 500, body: "x" }]);
  await assertRejects(() =>
    trigger.onUnsubscribe!(
      { params: { domain: "mg.example.com" }, state, subscriptionId: "s" },
      boom.ctx,
    )
  );
});
