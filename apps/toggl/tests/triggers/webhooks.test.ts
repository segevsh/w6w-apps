import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import timeEntryCreated from "../../triggers/time-entry-created.ts";
import timeEntryUpdated from "../../triggers/time-entry-updated.ts";
import projectCreated from "../../triggers/project-created.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

const SECRET = "PGuRrhCFajIyEvFlreKL-extra";
const CALLBACK = "https://w6w.example/triggers/webhooks/sub_1";
const STATE = {
  subscriptionId: "77",
  workspaceId: "123456",
  callbackUrl: CALLBACK,
  entity: "time_entry",
  action: "created",
};
const PARAMS = { workspaceId: "123456", signingSecret: SECRET };
const WS = "https://api.track.toggl.com/webhooks/api/v1";

const iso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString();

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
function eventBody(over: { timestamp?: string } = {}) {
  return `{ "event_id": 1234567, "created_at": "2026-11-09T10:00:00Z", "creator_id": 6,
  "metadata": { "action": "created", "model": "time_entry", "workspace_id": "123456" },
  "payload": { "id": 987654321, "description": "Write docs" },
  "subscription_id": 77, "timestamp": "${
    over.timestamp ?? iso()
  }", "url_callback": "${CALLBACK}" }`;
}

function pingBody(code?: string, over: { timestamp?: string } = {}) {
  return `{ "event_id": 0, "creator_id": 6, "payload": "ping",
  ${code ? `"validation_code": "${code}",` : ""}
  "subscription_id": 77, "timestamp": "${
    over.timestamp ?? iso()
  }", "url_callback": "${CALLBACK}" }`;
}

const sign = (body: string, key = SECRET) =>
  "sha256=" + createHmac("sha256", key).update(body).digest("hex");

function call(
  body: string,
  over: { headers?: Record<string, string>; rawBody?: string | null; method?: string } = {},
) {
  const rawBody = over.rawBody === null ? undefined : over.rawBody ?? body;
  return {
    method: over.method ?? "POST",
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers: over.headers ?? { "x-webhook-signature-256": sign(body) },
    body: JSON.parse(body),
    ...(rawBody === undefined ? {} : { rawBody }),
  };
}

function ingest(
  raw: ReturnType<typeof call>,
  opts: { state?: unknown; params?: unknown } = {},
) {
  return timeEntryCreated.handleIngest!(
    {
      raw,
      params: (opts.params === undefined ? PARAMS : opts.params) as never,
      state: (opts.state === undefined ? STATE : opts.state) as never,
      subscriptionId: "sub_1",
    },
    mockCtx().ctx,
  );
}

test("fixture bodies are non-canonical JSON", () => {
  const b = eventBody();
  assert(JSON.stringify(JSON.parse(b)) !== b);
});

test("valid signature over the raw body emits one event", async () => {
  assertEquals(evs(await ingest(call(eventBody()))), [{
    eventId: "1234567",
    entity: "time_entry",
    action: "created",
    createdAt: "2026-11-09T10:00:00Z",
    workspaceId: "123456",
    creatorId: "6",
    payload: { id: 987654321, description: "Write docs" },
  }]);
});

test("a signature over the re-serialised body is refused", async () => {
  const b = eventBody();
  await assertRejects(
    () =>
      ingest(
        call(b, { headers: { "x-webhook-signature-256": sign(JSON.stringify(JSON.parse(b))) } }),
      ),
    Error,
    "signature does not match",
  );
});

test("one flipped byte in the body is refused", async () => {
  const b = eventBody();
  await assertRejects(
    () => ingest(call(b, { rawBody: b.replace("Write docs", "Write dock") })),
    Error,
    "signature does not match",
  );
});

test("a missing signature header is refused", async () => {
  await assertRejects(
    () => ingest(call(eventBody(), { headers: {} })),
    Error,
    "X-Webhook-Signature-256 is missing",
  );
});

test("a signature without the sha256= prefix is refused", async () => {
  const b = eventBody();
  await assertRejects(
    () => ingest(call(b, { headers: { "x-webhook-signature-256": sign(b).slice(7) } })),
    Error,
    "signature does not match",
  );
});

test("a signature made with another secret is refused", async () => {
  const b = eventBody();
  await assertRejects(
    () => ingest(call(b, { headers: { "x-webhook-signature-256": sign(b, "w".repeat(24)) } })),
    Error,
    "signature does not match",
  );
});

test("an absent rawBody is refused", async () => {
  await assertRejects(() => ingest(call(eventBody(), { rawBody: null })), Error, "raw body");
});

test("an unset or empty signing secret refuses the delivery", async () => {
  for (const params of [{}, { signingSecret: "" }, { signingSecret: 7 }]) {
    await assertRejects(
      () => ingest(call(eventBody(), { headers: {} }), { params }),
      Error,
      "secret",
    );
  }
});

test("a stale or missing timestamp is refused even when correctly signed", async () => {
  const stale = eventBody({ timestamp: iso(-10 * 60 * 1000) });
  await assertRejects(() => ingest(call(stale)), Error, "timestamp");
  const future = eventBody({ timestamp: iso(10 * 60 * 1000) });
  await assertRejects(() => ingest(call(future)), Error, "timestamp");
  const none = eventBody().replace(/"timestamp": "[^"]*",/, "");
  await assertRejects(() => ingest(call(none)), Error, "timestamp");
});

test("a timestamp inside the window is accepted", async () => {
  const b = eventBody({ timestamp: iso(-60 * 1000) });
  assertEquals(evs(await ingest(call(b))).length, 1);
});

test("refusals never echo the secret, the signature or a header value", async () => {
  const bad = "sha256=" + "cd".repeat(32);
  const err = await assertRejects(() =>
    ingest(call(eventBody(), { headers: { "x-webhook-signature-256": bad } }))
  );
  assert(!err.message.includes(SECRET) && !err.message.includes(bad));
});

test("a non-POST delivery is refused", async () => {
  await assertRejects(() => ingest(call(eventBody(), { method: "GET" })), Error, "POST");
});

test("a signed delivery for another callback URL or subscription is refused", async () => {
  const b = eventBody().replace(CALLBACK, "https://evil.example/hook");
  await assertRejects(() => ingest(call(b)), Error, "another callback URL");
  const c = eventBody().replace('"subscription_id": 77', '"subscription_id": 78');
  await assertRejects(() => ingest(call(c)), Error, "another subscription");
});

test("a signed PING with a validation code is answered with that code", async () => {
  const result = await ingest(call(pingBody("code-abc-123")));
  assertEquals(evs(result), []);
  assertEquals((result as { response?: unknown }).response, {
    headers: { "content-type": "application/json" },
    body: '{"validation_code":"code-abc-123"}',
  });
});

test("a PING during registration (no state yet) is verified with the param secret and answered", async () => {
  const result = await ingest(call(pingBody("code-xyz")), { state: {} });
  assertEquals(
    (result as { response?: { body?: string } }).response?.body,
    '{"validation_code":"code-xyz"}',
  );
});

test("a forged PING is never answered with a validation code", async () => {
  const b = pingBody("code-forged");
  await assertRejects(
    () => ingest(call(b, { headers: { "x-webhook-signature-256": sign(b, "q".repeat(24)) } })),
    Error,
    "signature does not match",
  );
  await assertRejects(() => ingest(call(b, { headers: {} })), Error, "is missing");
});

test("a signed PING without a validation code is acknowledged with no events", async () => {
  const result = await ingest(call(pingBody()));
  assertEquals(result, []);
});

test("onSubscribe creates a filtered subscription with the secret, then pings it", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { subscription_id: 77, enabled: true, validated_at: null } },
    { status: 200, body: {} },
  ]);
  const state = await timeEntryCreated.onSubscribe!(
    {
      params: PARAMS,
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "https://w6w.example",
    },
    ctx,
  );
  assertEquals(state, STATE);
  assertEquals(calls.length, 2);
  assertEquals([calls[0].method, calls[0].url], ["POST", `${WS}/subscriptions/123456`]);
  assertEquals(JSON.parse(calls[0].body!), {
    url_callback: CALLBACK,
    event_filters: [{ entity: "time_entry", action: "created" }],
    enabled: true,
    description: "w6w sub_1",
    secret: SECRET,
  });
  assertEquals([calls[1].method, calls[1].url], ["POST", `${WS}/ping/123456/77`]);
});

test("the other triggers register their own entity and action", async () => {
  const cases: Array<[typeof timeEntryUpdated, string, string]> = [
    [timeEntryUpdated, "time_entry", "updated"],
    [projectCreated, "project", "created"],
  ];
  for (const [trigger, entity, action] of cases) {
    const { ctx, calls } = mockCtx([{ body: { subscription_id: 5 } }, { body: {} }]);
    await trigger.onSubscribe!(
      { params: PARAMS, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
      ctx,
    );
    assertEquals(JSON.parse(calls[0].body!).event_filters, [{ entity, action }]);
  }
});

test("onSubscribe deletes the subscription when the PING fails", async () => {
  const { ctx, calls } = mockCtx([
    { body: { subscription_id: 77 } },
    { status: 500, body: "boom" },
    { status: 200, body: {} },
  ]);
  await assertRejects(
    () =>
      timeEntryCreated.onSubscribe!(
        { params: PARAMS, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
        ctx,
      ),
    Error,
    "Toggl 500",
  );
  assertEquals(calls.map((c) => `${c.method} ${new URL(c.url).pathname}`), [
    "POST /webhooks/api/v1/subscriptions/123456",
    "POST /webhooks/api/v1/ping/123456/77",
    "DELETE /webhooks/api/v1/subscriptions/123456/77",
  ]);
});

test("onSubscribe refuses bad params before any request", async () => {
  const { ctx, calls } = mockCtx();
  const bad = [
    {},
    { workspaceId: "abc", signingSecret: SECRET },
    { workspaceId: "1" },
    { workspaceId: "1", signingSecret: "short" },
  ];
  for (const params of bad) {
    await assertRejects(() =>
      timeEntryCreated.onSubscribe!(
        { params, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
        ctx,
      )
    );
  }
  assertEquals(calls.length, 0);
});

test("onUnsubscribe deletes the subscription; 404 and 410 mean already gone", async () => {
  for (const status of [200, 404, 410]) {
    const { ctx, calls } = mockCtx([{ status, body: {} }]);
    await timeEntryCreated.onUnsubscribe!({
      params: PARAMS,
      state: STATE as never,
      subscriptionId: "s",
    }, ctx);
    assertEquals(calls.length, 1);
    assertEquals([calls[0].method, calls[0].url], ["DELETE", `${WS}/subscriptions/123456/77`]);
  }
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  await assertRejects(
    () =>
      timeEntryCreated.onUnsubscribe!({
        params: PARAMS,
        state: STATE as never,
        subscriptionId: "s",
      }, ctx),
    Error,
    "Toggl 500",
  );
});

test("onUnsubscribe with no stored subscription makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await timeEntryCreated.onUnsubscribe!(
    { params: PARAMS, state: {} as never, subscriptionId: "s" },
    ctx,
  );
  assertEquals(calls.length, 0);
});
