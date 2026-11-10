import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import trigger from "../../triggers/signal-received.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-account-secret-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const NOW = Math.floor(Date.now() / 1000);

const sig = (ts: string, body: string, key = SECRET) =>
  createHmac("sha256", key).update(`${ts}.${body}`).digest("hex");

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const BODY = `{ "id" : "evt-1",  "type":"promotion", "entityType": "contact",
  "entityId":"4158887495", "subscriptionId" : "sub-9",
  "data": { "personId": 4158887495,  "currentTitle":"Bartender" },
  "timestamp":"2026-11-10T10:30:00.000Z", "billing": { "creditsCharged": 1 } }`;

const call = (
  rawBody: string | null,
  headers: Record<string, string>,
  secret: string | null = SECRET,
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers,
    body: rawBody === null ? null : JSON.parse(rawBody),
    ...(rawBody === null ? {} : { rawBody }),
  },
  params: {
    entityType: "contact",
    entityIds: "1,2",
    signingSecret: (secret ?? undefined) as string,
  },
  state: { subscriptionIds: ["sub-9"] },
  subscriptionId: "sub_1",
});

const signed = (body = BODY, ts = String(NOW), key = SECRET) => ({
  "x-lusha-signature": sig(ts, body, key),
  "x-lusha-timestamp": ts,
});

const ingest = (input: ReturnType<typeof call>) =>
  trigger.handleIngest!(input as never, mockCtx().ctx);

async function refused(fn: () => Promise<unknown>, includes: string) {
  try {
    await fn();
  } catch (err) {
    assert(err instanceof Error && err.message.includes(includes), `message: ${String(err)}`);
    return;
  }
  throw new Error("expected the delivery to be refused");
}

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares the webhook trigger with output and sample, no poll", () => {
  // More triggers were added later (named-signals.test.ts, new-subscription.test.ts); this one stays first.
  assertEquals(app.triggers[0].key, "signal-received");
  assert(app.triggers[0] === trigger);
  assert(trigger.output!.length > 0);
  assert(trigger.sample !== undefined);
  assertEquals(trigger.poll, undefined);
  assertEquals(typeof trigger.onSubscribe, "function");
  assertEquals(typeof trigger.onUnsubscribe, "function");
});

test("onSubscribe: POST /api/subscriptions with the literal body, stores the ids", async () => {
  const m = mockCtx([{
    status: 201,
    body: {
      total: 2,
      successful: 2,
      failed: 0,
      results: [
        { index: 0, success: true, subscription: { id: "s-1" } },
        { index: 1, success: true, subscription: { id: "s-2" } },
      ],
    },
  }]);
  const state = await trigger.onSubscribe!(
    {
      params: { entityType: "company", entityIds: "11, 22", signalTypes: "promotion,jobChange" },
      callbackUrl: CALLBACK,
      subscriptionId: "sub_1",
    } as never,
    m.ctx,
  );
  assertEquals(state, { subscriptionIds: ["s-1", "s-2"] });
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "POST");
  assertEquals(m.calls[0].url, "https://api.lusha.com/api/subscriptions");
  assertEquals(JSON.parse(m.calls[0].body!), {
    defaults: { url: CALLBACK, entityType: "company", signalTypes: ["promotion", "jobChange"] },
    subscriptions: [{ entityId: "11" }, { entityId: "22" }],
  });
});

test("onSubscribe: a partial failure removes what was created and throws", async () => {
  const m = mockCtx([
    {
      status: 201,
      body: {
        results: [
          { index: 0, success: true, subscription: { id: "s-1" } },
          { index: 1, success: false, error: { code: "LIMIT", message: "x" } },
        ],
      },
    },
    { body: { results: [] } },
  ]);
  await refused(
    () =>
      trigger.onSubscribe!(
        {
          params: { entityType: "contact", entityIds: "1,2" },
          callbackUrl: CALLBACK,
          subscriptionId: "sub_1",
        } as never,
        m.ctx,
      ),
    "1 of 2",
  );
  assertEquals(m.calls.length, 2);
  assertEquals(m.calls[1].url, "https://api.lusha.com/api/subscriptions/delete");
  assertEquals(JSON.parse(m.calls[1].body!), { ids: ["s-1"] });
});

test("onSubscribe: no ids, or more than 25, is refused before any request", async () => {
  const m = mockCtx([]);
  const sub = (entityIds: string) =>
    trigger.onSubscribe!(
      {
        params: { entityType: "contact", entityIds },
        callbackUrl: CALLBACK,
        subscriptionId: "s",
      } as never,
      m.ctx,
    );
  await refused(() => sub(" , "), "at least one");
  await refused(
    () => sub(Array.from({ length: 26 }, (_, i) => String(i + 1)).join(",")),
    "up to 25",
  );
  assertEquals(m.calls.length, 0);
});

test("onUnsubscribe: POST /api/subscriptions/delete; NOT_FOUND = gone, other failures throw", async () => {
  const ok = mockCtx([{
    body: {
      results: [
        { index: 0, success: true },
        { index: 1, success: false, error: { code: "NOT_FOUND", message: "gone" } },
      ],
    },
  }]);
  await trigger.onUnsubscribe!(
    { state: { subscriptionIds: ["s-1", "s-2"] }, subscriptionId: "sub_1" } as never,
    ok.ctx,
  );
  assertEquals(ok.calls[0].method, "POST");
  assertEquals(ok.calls[0].url, "https://api.lusha.com/api/subscriptions/delete");
  assertEquals(JSON.parse(ok.calls[0].body!), { ids: ["s-1", "s-2"] });

  const bad = mockCtx([{
    body: { results: [{ index: 0, success: false, error: { code: "X" } }] },
  }]);
  await refused(
    () =>
      trigger.onUnsubscribe!(
        { state: { subscriptionIds: ["s-1"] }, subscriptionId: "s" } as never,
        bad.ctx,
      ),
    "could not delete",
  );
  const none = mockCtx([]);
  await trigger.onUnsubscribe!({ state: {}, subscriptionId: "s" } as never, none.ctx);
  assertEquals(none.calls.length, 0);
});

test("valid signature (node:crypto) → one normalized event and the required ack", async () => {
  const result = await ingest(call(BODY, signed()));
  const out = evs(result) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].type, "promotion");
  assertEquals(out[0].entityId, "4158887495");
  assertEquals(out[0].creditsCharged, 1);
  assertEquals(out[0].data, { personId: 4158887495, currentTitle: "Bartender" });
  const res =
    (result as { response: { status: number; headers: Record<string, string>; body: string } })
      .response;
  assertEquals(res.status, 200);
  assertEquals(res.headers, { "content-type": "application/json" });
  const ack = JSON.parse(res.body);
  assertEquals(ack.received, true);
  assertEquals(ack.webhookId, "evt-1");
  assert(typeof ack.timestamp === "string" && !Number.isNaN(Date.parse(ack.timestamp)));
});

test("a millisecond timestamp is accepted when its signature matches", async () => {
  const ts = String(Date.now());
  assertEquals((evs(await ingest(call(BODY, signed(BODY, ts)))) as unknown[]).length, 1);
});

test("signature made with another secret → refused", async () => {
  await refused(
    () => ingest(call(BODY, signed(BODY, String(NOW), "another-secret-value-xxxxxxxxxxxx"))),
    "signature",
  );
});

test("one flipped byte in the body → refused", async () => {
  const headers = signed();
  await refused(() => ingest(call(BODY.replace("Bartender", "Bartendeq"), headers)), "signature");
});

test("one flipped byte in the signature → refused", async () => {
  const h = signed();
  const s = h["x-lusha-signature"];
  await refused(
    () =>
      ingest(call(BODY, { ...h, "x-lusha-signature": (s[0] === "0" ? "1" : "0") + s.slice(1) })),
    "signature",
  );
});

test("signature or timestamp header missing → refused", async () => {
  const h = signed();
  await refused(
    () => ingest(call(BODY, { "x-lusha-timestamp": h["x-lusha-timestamp"] })),
    "missing",
  );
  await refused(
    () => ingest(call(BODY, { "x-lusha-signature": h["x-lusha-signature"] })),
    "missing",
  );
});

test("stale or future timestamp → refused even with a valid signature over it", async () => {
  for (const delta of [-400, -86400, 400, 86400]) {
    await refused(() => ingest(call(BODY, signed(BODY, String(NOW + delta)))), "window");
  }
  assertEquals(
    (evs(await ingest(call(BODY, signed(BODY, String(NOW - 200))))) as unknown[]).length,
    1,
  );
  await refused(() => ingest(call(BODY, signed(BODY, "yesterday"))), "window");
});

test("rawBody absent → refused", async () => {
  await refused(() => ingest(call(null, signed())), "raw body");
});

test("unset or empty signing secret → refused", async () => {
  for (const secret of [null, ""]) {
    await refused(() => ingest(call(BODY, signed(), secret)), "secret");
  }
});

test("errors never contain the secret, the signature or the body", async () => {
  const h = signed(BODY, String(NOW), "another-secret-value-xxxxxxxxxxxx");
  try {
    await ingest(call(BODY, h));
    throw new Error("should have thrown");
  } catch (err) {
    const m = (err as Error).message;
    assert(!m.includes(SECRET) && !m.includes(h["x-lusha-signature"]) && !m.includes("Bartender"));
  }
});
