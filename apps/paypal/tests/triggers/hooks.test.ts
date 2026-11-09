import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import type { HookContext, TriggerCall } from "@w6w/types";
import { mockCtx, mockPayPalCtx } from "../_helpers.ts";
import app from "../../index.ts";
import paymentCaptured from "../../triggers/payment-captured.ts";
import genericEvent from "../../triggers/event.ts";
import { parseEventTypeList, type TriggerState } from "../../lib/triggers.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const HOST = "https://api.example.test";
const VERIFY = "https://api-m.paypal.com/v1/notifications/verify-webhook-signature";
const WEBHOOKS = "https://api-m.paypal.com/v1/notifications/webhooks";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** A PayPal event body with whitespace PayPal's compact JSON never has, so re-serialising differs. */
const BODY = `{
  "id": "WH-58D329510W468432D-8HN650336L201105X",
  "event_version": "1.0",
  "create_time": "2026-11-09T10:12:50.000Z",
  "resource_type": "capture",
  "resource_version": "2.0",
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "summary": "Payment completed for $ 20.0 USD",
  "resource": { "id": "5O190127TN364715T", "status": "COMPLETED", "note": "caf\\u00e9" }
}`;

const SIG_HEADERS = {
  "paypal-auth-algo": "SHA256withRSA",
  "paypal-cert-url":
    "https://api.paypal.com/v1/notifications/certs/CERT-360caa42-fca2a594-1d93a270",
  "paypal-transmission-id": "b4d5e6f0-1c2d-11ef-9a3b-0242ac120002",
  "paypal-transmission-sig": "S2lndGhpc2lzbm90YXJlYWxzaWduYXR1cmU=",
  "paypal-transmission-time": "2026-11-09T10:12:50Z",
};

function delivery(
  rawBody: string | undefined,
  headers: Record<string, string>,
  method = "POST",
): TriggerCall {
  let body: unknown = rawBody;
  try {
    body = rawBody === undefined ? undefined : JSON.parse(rawBody);
  } catch { /* keep text */ }
  const call: TriggerCall = {
    method,
    path: "/triggers/webhooks/sub_abc",
    query: {},
    headers,
    body,
  };
  if (rawBody !== undefined) call.rawBody = rawBody;
  return call;
}

const STATE: TriggerState = {
  webhookId: "1JE4291016473214C",
  eventTypes: ["PAYMENT.CAPTURE.COMPLETED"],
};

function ingest(
  trigger: typeof paymentCaptured,
  call: TriggerCall,
  ctx: HookContext,
  state: Partial<TriggerState> | null = STATE,
) {
  return trigger.handleIngest!(
    {
      raw: call,
      params: {},
      state: (state ?? undefined) as TriggerState,
      subscriptionId: "sub_abc",
    },
    ctx,
  );
}

const SUCCESS = { body: { verification_status: "SUCCESS" } };

test("fixture: the body is not canonical JSON, so re-serialising would change what PayPal checksums", () => {
  assertEquals(JSON.stringify(JSON.parse(BODY)) !== BODY, true);
});

test("the app declares six webhook triggers, each with output and a sample", () => {
  const triggers = app.triggers ?? [];
  assertEquals(triggers.length, 6);
  for (const t of triggers) {
    assertEquals(typeof t.handleIngest, "function", t.key);
    assertEquals(typeof t.onSubscribe, "function", t.key);
    assertEquals(typeof t.onUnsubscribe, "function", t.key);
    assertEquals(typeof t.poll, "undefined", t.key);
    assertEquals((t.output?.length ?? 0) > 0, true, t.key);
    assertEquals(t.sample !== undefined, true, t.key);
  }
});

test("handleIngest: PayPal answering SUCCESS yields the normalized event", async () => {
  const { ctx } = mockPayPalCtx([SUCCESS]);
  const out = evs(await ingest(paymentCaptured, delivery(BODY, SIG_HEADERS), ctx));
  assertEquals(out, [{
    id: "WH-58D329510W468432D-8HN650336L201105X",
    eventType: "PAYMENT.CAPTURE.COMPLETED",
    resourceType: "capture",
    summary: "Payment completed for $ 20.0 USD",
    createTime: "2026-11-09T10:12:50.000Z",
    eventVersion: "1.0",
    resourceVersion: "2.0",
    transmissionId: "b4d5e6f0-1c2d-11ef-9a3b-0242ac120002",
    resource: { id: "5O190127TN364715T", status: "COMPLETED", note: "café" },
  }]);
});

test("handleIngest: the verify request carries the headers, the stored webhook id and the raw body text", async () => {
  const { ctx, calls } = mockPayPalCtx([SUCCESS]);
  await ingest(paymentCaptured, delivery(BODY, SIG_HEADERS), ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, VERIFY);
  assertEquals(
    calls[0].body,
    '{"auth_algo":"SHA256withRSA",' +
      '"cert_url":"https://api.paypal.com/v1/notifications/certs/CERT-360caa42-fca2a594-1d93a270",' +
      '"transmission_id":"b4d5e6f0-1c2d-11ef-9a3b-0242ac120002",' +
      '"transmission_sig":"S2lndGhpc2lzbm90YXJlYWxzaWduYXR1cmU=",' +
      '"transmission_time":"2026-11-09T10:12:50Z",' +
      '"webhook_id":"1JE4291016473214C",' +
      `"webhook_event":${BODY}}`,
  );
});

test("handleIngest: a sandbox connection verifies against the sandbox host; header case is free", async () => {
  const { ctx, calls } = mockPayPalCtx([SUCCESS], true);
  const upper = Object.fromEntries(
    Object.entries(SIG_HEADERS).map(([k, v]) => [k.toUpperCase(), v]),
  );
  assertEquals(evs(await ingest(paymentCaptured, delivery(BODY, upper), ctx)).length, 1);
  assertEquals(
    calls[0].url,
    "https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature",
  );
});

test("handleIngest: PayPal answering FAILURE throws and yields no event", async () => {
  const { ctx } = mockPayPalCtx([{ body: { verification_status: "FAILURE" } }]);
  await assertRejects(
    async () => await ingest(paymentCaptured, delivery(BODY, SIG_HEADERS), ctx),
    Error,
    "did not verify",
  );
});

test("handleIngest: a failed, empty or malformed verification answer throws", async () => {
  for (
    const answer of [
      { status: 500, body: { name: "INTERNAL_SERVER_ERROR" } },
      { status: 401, body: { error: "invalid_token" } },
      { body: "not json" },
      { body: {} },
      { body: { verification_status: "success" } },
      { body: { verification_status: ["SUCCESS"] } },
    ]
  ) {
    const { ctx } = mockPayPalCtx([answer]);
    await assertRejects(
      async () => await ingest(paymentCaptured, delivery(BODY, SIG_HEADERS), ctx),
      Error,
      "refused",
    );
  }
});

test("handleIngest: each missing signature header throws before PayPal is called", async () => {
  for (const name of Object.keys(SIG_HEADERS)) {
    const { [name]: _gone, ...rest } = SIG_HEADERS;
    const { ctx, calls } = mockPayPalCtx();
    await assertRejects(
      async () => await ingest(paymentCaptured, delivery(BODY, rest), ctx),
      Error,
      name.toUpperCase(),
    );
    assertEquals(calls.length, 0);
    await assertRejects(
      async () => await ingest(paymentCaptured, delivery(BODY, { ...rest, [name]: "" }), ctx),
      Error,
      name.toUpperCase(),
    );
  }
  const { ctx, calls } = mockPayPalCtx();
  await assertRejects(async () => await ingest(paymentCaptured, delivery(BODY, {}), ctx), Error);
  assertEquals(calls.length, 0);
});

test("handleIngest: an absent rawBody throws before PayPal is called", async () => {
  const call = delivery(BODY, SIG_HEADERS);
  delete call.rawBody;
  const { ctx, calls } = mockPayPalCtx();
  await assertRejects(async () => await ingest(paymentCaptured, call, ctx), Error, "raw body");
  assertEquals(calls.length, 0);
});

test("handleIngest: an unset or empty webhook id refuses before PayPal is called", async () => {
  for (const webhookId of [undefined, ""]) {
    const { ctx, calls } = mockPayPalCtx();
    await assertRejects(
      async () =>
        await ingest(paymentCaptured, delivery(BODY, SIG_HEADERS), ctx, {
          ...STATE,
          webhookId,
        } as unknown as Partial<TriggerState>),
      Error,
      "secret",
    );
    assertEquals(calls.length, 0);
  }
  const { ctx, calls } = mockPayPalCtx();
  await assertRejects(
    async () => await ingest(paymentCaptured, delivery(BODY, SIG_HEADERS), ctx, null),
    Error,
    "secret",
  );
  assertEquals(calls.length, 0);
});

test("handleIngest: a body that could break out of the webhook_event position is never sent", async () => {
  for (
    const evil of [
      '{"a":1},"webhook_id":"attacker"',
      '{"a":1}}, {"x":',
      "[1,2]",
      "not json",
      '"just a string"',
      "",
    ]
  ) {
    const { ctx, calls } = mockPayPalCtx();
    await assertRejects(
      async () => await ingest(paymentCaptured, delivery(evil, SIG_HEADERS), ctx),
      Error,
      "JSON object",
    );
    assertEquals(calls.length, 0);
  }
});

test("handleIngest: a header value cannot alter the verify request's structure", async () => {
  const { ctx, calls } = mockPayPalCtx([SUCCESS]);
  const sneaky = { ...SIG_HEADERS, "paypal-transmission-id": 'x","webhook_id":"attacker' };
  await ingest(paymentCaptured, delivery(BODY, sneaky), ctx);
  const sent = JSON.parse(calls[0].body ?? "");
  assertEquals(sent.webhook_id, "1JE4291016473214C");
  assertEquals(sent.transmission_id, 'x","webhook_id":"attacker');
});

test("handleIngest: error text never echoes the signature, the cert URL or the webhook id", async () => {
  const messages: string[] = [];
  const failures = [
    mockPayPalCtx([{ body: { verification_status: "FAILURE" } }]).ctx,
    mockPayPalCtx([{ status: 500, body: "x" }]).ctx,
  ];
  for (const ctx of failures) {
    try {
      await ingest(paymentCaptured, delivery(BODY, SIG_HEADERS), ctx);
    } catch (err) {
      messages.push((err as Error).message);
    }
  }
  assertEquals(messages.length, 2);
  for (const m of messages) {
    for (const secret of [...Object.values(SIG_HEADERS), STATE.webhookId]) {
      assertEquals(m.includes(secret), false);
    }
  }
});

test("handleIngest: non-POST throws; an event type outside the subscription is acknowledged with none", async () => {
  await assertRejects(
    async () =>
      await ingest(paymentCaptured, delivery(BODY, SIG_HEADERS, "GET"), mockPayPalCtx().ctx),
    Error,
    "POST",
  );
  const other = BODY.replace("PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.REFUNDED");
  assertEquals(
    evs(await ingest(paymentCaptured, delivery(other, SIG_HEADERS), mockPayPalCtx([SUCCESS]).ctx)),
    [],
  );
});

test("handleIngest: the generic trigger follows its stored event types and accepts *", async () => {
  const none: TriggerState = { ...STATE, eventTypes: ["BILLING.SUBSCRIPTION.CANCELLED"] };
  assertEquals(
    evs(
      await ingest(genericEvent, delivery(BODY, SIG_HEADERS), mockPayPalCtx([SUCCESS]).ctx, none),
    ),
    [],
  );
  const any: TriggerState = { ...STATE, eventTypes: ["*"] };
  assertEquals(
    evs(await ingest(genericEvent, delivery(BODY, SIG_HEADERS), mockPayPalCtx([SUCCESS]).ctx, any))
      .length,
    1,
  );
});

test("handleIngest: a verified body without id and event_type is not an event", async () => {
  await assertRejects(
    async () =>
      await ingest(
        paymentCaptured,
        delivery('{ "hello": "world" }', SIG_HEADERS),
        mockPayPalCtx([SUCCESS]).ctx,
      ),
    Error,
    "Not a PayPal event",
  );
});

test("parseEventTypeList: trims, drops blanks and duplicates", () => {
  assertEquals(parseEventTypeList(" A.B, ,C.D,A.B "), ["A.B", "C.D"]);
  assertEquals(parseEventTypeList(undefined), []);
});

function subscribe(
  trigger: typeof paymentCaptured,
  params: Record<string, unknown>,
  ctx: HookContext,
) {
  return trigger.onSubscribe!(
    { params, subscriptionId: "sub_abc", callbackUrl: CALLBACK, hostUrl: HOST },
    ctx,
  ) as Promise<TriggerState>;
}

test("onSubscribe: lists, then creates the webhook and keeps its id", async () => {
  const { ctx, calls } = mockPayPalCtx([
    { body: { webhooks: [{ id: "OTHER1", url: "https://elsewhere.test/x" }] } },
    { status: 201, body: { id: "1JE4291016473214C", url: CALLBACK } },
  ]);
  const state = await subscribe(paymentCaptured, {}, ctx);
  assertEquals(state, {
    webhookId: "1JE4291016473214C",
    eventTypes: ["PAYMENT.CAPTURE.COMPLETED"],
  });
  assertEquals(calls.length, 2);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, WEBHOOKS);
  assertEquals(calls[1].method, "POST");
  assertEquals(calls[1].url, WEBHOOKS);
  assertEquals(
    calls[1].body,
    `{"url":"${CALLBACK}","event_types":[{"name":"PAYMENT.CAPTURE.COMPLETED"}]}`,
  );
});

test("onSubscribe: deletes a leftover webhook carrying this callback URL first", async () => {
  const { ctx, calls } = mockPayPalCtx([
    { body: { webhooks: [{ id: "STALE1", url: CALLBACK }] } },
    { status: 204 },
    { status: 201, body: { id: "NEW1" } },
  ]);
  await subscribe(paymentCaptured, {}, ctx);
  assertEquals(calls[1].method, "DELETE");
  assertEquals(calls[1].url, `${WEBHOOKS}/STALE1`);
  assertEquals(calls[2].method, "POST");
});

test("onSubscribe: the generic trigger registers the listed event types", async () => {
  const { ctx, calls } = mockPayPalCtx([
    { body: { webhooks: [] } },
    { status: 201, body: { id: "NEW1" } },
  ]);
  const state = await subscribe(genericEvent, { eventTypes: "PAYMENT.SALE.COMPLETED, *" }, ctx);
  assertEquals(state.eventTypes, ["PAYMENT.SALE.COMPLETED", "*"]);
  assertEquals(JSON.parse(calls[1].body ?? "").event_types, [
    { name: "PAYMENT.SALE.COMPLETED" },
    { name: "*" },
  ]);
  await assertRejects(
    async () => await subscribe(genericEvent, { eventTypes: " , " }, mockCtx().ctx),
    Error,
    "at least one",
  );
});

test("onSubscribe: a response without an id fails", async () => {
  const { ctx } = mockPayPalCtx([{ body: { webhooks: [] } }, { status: 201, body: {} }]);
  await assertRejects(async () => await subscribe(paymentCaptured, {}, ctx), Error, "no id");
});

test("onUnsubscribe: deletes the webhook; 404 and 410 mean already gone; other errors surface", async () => {
  const run = (ctx: HookContext, state: Partial<TriggerState> = STATE) =>
    paymentCaptured.onUnsubscribe!(
      { params: {}, state: state as TriggerState, subscriptionId: "sub_abc" },
      ctx,
    );
  const ok = mockPayPalCtx([{ status: 204 }]);
  await run(ok.ctx);
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(ok.calls[0].url, `${WEBHOOKS}/1JE4291016473214C`);
  for (const status of [404, 410]) {
    await run(mockPayPalCtx([{ status, body: { name: "INVALID_RESOURCE_ID" } }]).ctx);
  }
  await assertRejects(
    async () => await run(mockPayPalCtx([{ status: 500, body: { name: "INTERNAL" } }]).ctx),
    Error,
    "500",
  );
  const none = mockPayPalCtx();
  await run(none.ctx, {});
  assertEquals(none.calls.length, 0);
});
