import { test } from "node:test";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import reportingEvent from "../../triggers/reporting-event.ts";
import emailOpened from "../../triggers/email-opened.ts";
import emailClicked from "../../triggers/email-clicked.ts";
import customerUnsubscribed from "../../triggers/customer-unsubscribed.ts";

const SECRET = "cio-signing-key-0123456789abcdef";
const PARAMS = { signingSecret: SECRET };

/** Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY. */
const BODY =
  '{ "data": { "customer_id": "abcd-1234",  "delivery_id": "RPILAg", "recipient": "test@example.com" },\n  "event_id": "01E4C8AY5K21N2QNRBD9YXJ13Z", "object_type": "email", "metric": "opened", "timestamp": 1585254331 }';

/** Narrow the `E[] | { events, response? }` union (brief §3). */
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** Expected signature, computed independently of the app: hex(HMAC-SHA256(secret, v0:ts:body)). */
const sign = (ts: string, body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(`v0:${ts}:${body}`).digest("hex");

const nowSec = () => String(Math.floor(Date.now() / 1000));

function call(
  headers: Record<string, string>,
  rawBody: string | null = BODY,
  method = "POST",
): TriggerCall {
  const raw: TriggerCall = { method, path: "/hook", query: {}, headers, body: null };
  if (rawBody !== null) {
    raw.rawBody = rawBody;
    raw.body = JSON.parse(rawBody);
  }
  return raw;
}

function signed(ts = nowSec(), body = BODY): Record<string, string> {
  return { "x-cio-signature": sign(ts, body), "x-cio-timestamp": ts };
}

async function ingest(raw: TriggerCall, params: unknown = PARAMS, trigger = emailOpened) {
  const { ctx } = mockCtx();
  return await trigger.handleIngest!(
    { raw, params: params as typeof PARAMS, state: undefined as never, subscriptionId: "sub-1" },
    ctx,
  );
}

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("handleIngest: a valid signature over v0:timestamp:rawBody yields the event", async () => {
  const out = evs(await ingest(call(signed())));
  assertEquals(out, [{
    eventId: "01E4C8AY5K21N2QNRBD9YXJ13Z",
    objectType: "email",
    metric: "opened",
    timestamp: 1585254331,
    customerId: "abcd-1234",
    recipient: "test@example.com",
    deliveryId: "RPILAg",
    data: { customer_id: "abcd-1234", delivery_id: "RPILAg", recipient: "test@example.com" },
  }]);
});

test("handleIngest: a one-byte change to the body throws", async () => {
  const headers = signed();
  await assertRejects(
    () => ingest(call(headers, BODY.replace("opened", "openee"))),
    Error,
    "refused",
  );
});

test("handleIngest: a flipped signature byte throws without echoing it", async () => {
  const ts = nowSec();
  const good = sign(ts, BODY);
  const bad = (good[0] === "a" ? "b" : "a") + good.slice(1);
  const err = await assertRejects(() =>
    ingest(call({ "x-cio-signature": bad, "x-cio-timestamp": ts }))
  );
  assert(err.message.includes("refused"));
  assert(!err.message.includes(bad) && !err.message.includes(SECRET));
});

test("handleIngest: a signature over the body alone (no v0:timestamp: prefix) does not verify", async () => {
  const ts = nowSec();
  const bodyOnly = createHmac("sha256", SECRET).update(BODY).digest("hex");
  await assertRejects(
    () => ingest(call({ "x-cio-signature": bodyOnly, "x-cio-timestamp": ts })),
    Error,
    "refused",
  );
});

test("handleIngest: a signature made with another secret throws", async () => {
  const ts = nowSec();
  await assertRejects(
    () => ingest(call({ "x-cio-signature": sign(ts, BODY, "another"), "x-cio-timestamp": ts })),
    Error,
    "refused",
  );
});

test("handleIngest: a signature over the re-serialised body does not verify", async () => {
  const ts = nowSec();
  const reserialised = JSON.stringify(JSON.parse(BODY));
  await assertRejects(
    () => ingest(call({ "x-cio-signature": sign(ts, reserialised), "x-cio-timestamp": ts })),
    Error,
    "refused",
  );
});

test("handleIngest: a missing signature or timestamp header throws", async () => {
  const ts = nowSec();
  await assertRejects(() => ingest(call({ "x-cio-timestamp": ts })), Error, "refused");
  await assertRejects(() => ingest(call({ "x-cio-signature": sign(ts, BODY) })), Error, "refused");
});

test("handleIngest: an absent rawBody throws", async () => {
  await assertRejects(() => ingest(call(signed(), null)), Error, "raw body");
});

test("handleIngest: a stale or future timestamp throws even though it signs correctly", async () => {
  for (const offset of [-600, 600]) {
    const ts = String(Math.floor(Date.now() / 1000) + offset);
    await assertRejects(() => ingest(call(signed(ts))), Error, "refused");
  }
});

test("handleIngest: a non-numeric timestamp throws even though it signs correctly", async () => {
  await assertRejects(() => ingest(call(signed("now"))), Error, "refused");
});

test("handleIngest: an unset or empty secret refuses even with an absent or empty header", async () => {
  const empty = call({ "x-cio-signature": "", "x-cio-timestamp": nowSec() });
  for (const params of [null, {}, { signingSecret: "" }]) {
    for (const raw of [call({}), empty, call(signed())]) {
      await assertRejects(() => ingest(raw, params), Error, "secret");
    }
  }
});

test("handleIngest: a non-POST delivery throws", async () => {
  await assertRejects(() => ingest(call(signed(), null, "GET")), Error, "POST");
});

test("handleIngest: a verified delivery of another metric is acknowledged, not emitted", async () => {
  assertEquals(evs(await ingest(call(signed()), PARAMS, emailClicked)), []);
  assertEquals(evs(await ingest(call(signed()), PARAMS, customerUnsubscribed)), []);
});

test("handleIngest: the generic trigger filters by the object type and metric params", async () => {
  const raw = call(signed());
  assertEquals(evs(await ingest(raw, PARAMS, reportingEvent)).length, 1);
  assertEquals(
    evs(await ingest(raw, { ...PARAMS, objectType: "email" }, reportingEvent)).length,
    1,
  );
  assertEquals(evs(await ingest(raw, { ...PARAMS, objectType: "sms" }, reportingEvent)).length, 0);
  assertEquals(evs(await ingest(raw, { ...PARAMS, metric: "opened" }, reportingEvent)).length, 1);
  assertEquals(evs(await ingest(raw, { ...PARAMS, metric: "bounced" }, reportingEvent)).length, 0);
});

test("handleIngest: a legacy-format event_type is split into object type and metric", async () => {
  const body =
    '{ "event_id": "e1",  "event_type": "email_opened", "data": { "customer_id": "c1" }, "timestamp": 1 }';
  const ts = nowSec();
  const out = evs(
    await ingest(call({ "x-cio-signature": sign(ts, body), "x-cio-timestamp": ts }, body)),
  ) as Array<{ objectType: string; metric: string }>;
  assertEquals([out[0].objectType, out[0].metric], ["email", "opened"]);
});

test("handleIngest: customer events carry the email address as the recipient", async () => {
  const body =
    '{ "data": { "customer_id": "0200102",  "email_address": "test@example.com" }, "event_id": "e2", "object_type": "customer", "metric": "unsubscribed", "timestamp": 2 }';
  const ts = nowSec();
  const out = evs(
    await ingest(
      call({ "x-cio-signature": sign(ts, body), "x-cio-timestamp": ts }, body),
      PARAMS,
      customerUnsubscribed,
    ),
  ) as Array<{ recipient: string }>;
  assertEquals(out[0].recipient, "test@example.com");
});

test("handleIngest: a verified body that is not JSON throws a body error", async () => {
  const body = "not json {";
  const ts = nowSec();
  const raw: TriggerCall = {
    method: "POST",
    path: "/hook",
    query: {},
    headers: { "x-cio-signature": sign(ts, body), "x-cio-timestamp": ts },
    body,
    rawBody: body,
  };
  await assertRejects(() => ingest(raw), Error, "not valid JSON");
});

test("triggers: each declares a required secret param, output, sample and webhook hooks", () => {
  for (const t of [reportingEvent, emailOpened, emailClicked, customerUnsubscribed]) {
    assert((t.output as unknown[]).length > 0, `${t.key} output`);
    assert(t.sample !== undefined, `${t.key} sample`);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
    assertEquals(typeof t.handleIngest, "function");
    assertEquals(t.poll, undefined);
    const secret = t.params!.find((p) => p.key === "signingSecret")!;
    assertEquals([secret.type, secret.required], ["secret", true]);
  }
});

test("onSubscribe: makes no Customer.io call and returns the callback URL for the dashboard", async () => {
  const { ctx, calls } = mockCtx();
  const state = await emailOpened.onSubscribe!(
    {
      params: PARAMS,
      subscriptionId: "s",
      callbackUrl: "https://w6w.example/hook/abc",
      hostUrl: "",
    },
    ctx,
  );
  assertEquals(state, { mode: "manual", callbackUrl: "https://w6w.example/hook/abc" });
  await emailOpened.onUnsubscribe!({ params: PARAMS, state, subscriptionId: "s" }, ctx);
  assertEquals(calls.length, 0);
});

test("onSubscribe: a missing or empty signing key is refused up front", async () => {
  const { ctx } = mockCtx();
  for (const params of [{}, { signingSecret: "" }]) {
    await assertRejects(
      async () =>
        await emailOpened.onSubscribe!(
          { params, subscriptionId: "s", callbackUrl: "https://w6w.example/h", hostUrl: "" },
          ctx,
        ),
      Error,
      "secret",
    );
  }
});
