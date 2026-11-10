import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import taskCompleted from "../../triggers/task-completed.ts";
import taskCreated from "../../triggers/task-created.ts";
import taskStarted from "../../triggers/task-started.ts";
import taskFailed from "../../triggers/task-failed.ts";
import taskAssigned from "../../triggers/task-assigned.ts";
import taskUpdated from "../../triggers/task-updated.ts";

// A hex secret like the dashboard shows. Test-only value.
const SECRET = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
const callbackUrl = "https://hooks.example.test/onfleet/sub_1";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Non-canonical whitespace: JSON.stringify(JSON.parse(RAW)) !== RAW.
const RAW = `{ "triggerId" : 3,\n  "triggerName":"taskCompleted",
  "time": 1763467200000 ,"taskId":"t1", "workerId":"w1",
  "data" : { "task": { "id": "t1", "state": 3 } } }`;
assertEquals(JSON.stringify(JSON.parse(RAW)) !== RAW, true);

// Independent of app code: node:crypto, key = the secret's hex-decoded bytes (docs.onfleet.com/reference/secrets).
const sign = (raw: string, secret = SECRET) =>
  createHmac("sha512", Buffer.from(secret, "hex")).update(raw).digest("hex");

const deliver = async (
  trigger: typeof taskCompleted,
  over: {
    method?: string;
    query?: Record<string, string>;
    headers?: Record<string, string>;
    rawBody?: string | undefined;
    body?: unknown;
    params?: Record<string, unknown>;
  } = {},
) =>
  await trigger.handleIngest!({
    raw: {
      method: over.method ?? "POST",
      path: "",
      query: over.query ?? {},
      headers: "headers" in over ? over.headers! : { "x-onfleet-signature": sign(RAW) },
      body: over.body ?? null,
      ...("rawBody" in over ? { rawBody: over.rawBody } : { rawBody: RAW }),
    },
    params: over.params ?? { signingSecret: SECRET },
    state: { webhookId: "wh1", trigger: 3 },
    subscriptionId: "sub",
  }, mockCtx().ctx);

test("onfleet: a correctly signed delivery becomes one event", async () => {
  const result = await deliver(taskCompleted);
  assertEquals(evs(result), [{
    triggerId: 3,
    triggerName: "taskCompleted",
    time: 1763467200000,
    taskId: "t1",
    workerId: "w1",
    adminId: null,
    task: { id: "t1", state: 3 },
    worker: null,
  }]);
  // upper-case hex from a vendor is still the same signature
  const upper = await deliver(taskCompleted, {
    headers: { "x-onfleet-signature": sign(RAW).toUpperCase() },
  });
  assertEquals(evs(upper).length, 1);
});

test("onfleet: one flipped body byte, one flipped signature byte, or a wrong secret is refused", async () => {
  const tampered = RAW.replace('"t1"', '"t2"');
  await assertRejects(() => deliver(taskCompleted, { rawBody: tampered }));
  const sig = sign(RAW);
  const flipped = (sig[0] === "0" ? "1" : "0") + sig.slice(1);
  await assertRejects(() =>
    deliver(taskCompleted, { headers: { "x-onfleet-signature": flipped } })
  );
  const other = "ab".repeat(32);
  await assertRejects(() =>
    deliver(taskCompleted, { headers: { "x-onfleet-signature": sign(RAW, other) } })
  );
});

test("onfleet: a signature over the re-serialised body does not verify (raw bytes are the input)", async () => {
  const reserialised = JSON.stringify(JSON.parse(RAW));
  await assertRejects(() =>
    deliver(taskCompleted, { headers: { "x-onfleet-signature": sign(reserialised) } })
  );
});

test("onfleet: a missing or empty signature header, or an absent raw body, is refused", async () => {
  for (const headers of [{}, { "x-onfleet-signature": "" }]) {
    const missing = await assertRejects(() => deliver(taskCompleted, { headers }));
    assertEquals(missing.message.includes("signature header is missing"), true);
  }
  const err = await assertRejects(() => deliver(taskCompleted, { rawBody: undefined }));
  assertEquals(err.message.includes("raw body"), true);
});

test("onfleet: an unset or empty configured secret refuses, even with an absent or empty signature", async () => {
  for (const params of [{}, { signingSecret: "" }, { signingSecret: undefined }]) {
    for (
      const headers of [{}, { "x-onfleet-signature": "" }, { "x-onfleet-signature": sign(RAW) }]
    ) {
      const err = await assertRejects(() => deliver(taskCompleted, { params, headers }));
      assertEquals(err.message.includes("secret"), true);
    }
  }
});

test("onfleet: a non-hex secret is refused and never echoed", async () => {
  const bad = "not-hex-at-all-zz";
  const err = await assertRejects(() => deliver(taskCompleted, { params: { signingSecret: bad } }));
  assertEquals(err.message.includes(bad), false);
  assertEquals(err.message.includes(sign(RAW)), false);
});

test("onfleet: a verified delivery for another trigger id is dropped; a non-delivery body throws", async () => {
  assertEquals(evs(await deliver(taskCreated)), []);
  assertEquals(evs(await deliver(taskFailed)), []);
  const junk = `{ "hello" : "world" }`;
  await assertRejects(() =>
    deliver(taskCompleted, { rawBody: junk, headers: { "x-onfleet-signature": sign(junk) } })
  );
  const notJson = "not json {";
  await assertRejects(() =>
    deliver(taskCompleted, { rawBody: notJson, headers: { "x-onfleet-signature": sign(notJson) } })
  );
});

test("onfleet: the ?check= handshake is echoed as plain text with HTTP 200", async () => {
  const result = await deliver(taskCompleted, {
    method: "GET",
    query: { check: "b1946ac92492d2347c6235b4d2611184" },
    headers: {},
    rawBody: undefined,
    params: {},
  });
  assertEquals(evs(result), []);
  assertEquals((result as { response?: unknown }).response, {
    status: 200,
    headers: { "content-type": "text/plain" },
    body: "b1946ac92492d2347c6235b4d2611184",
  });
});

test("onfleet: a missing, empty or malformed ?check= is refused", async () => {
  for (const query of [{}, { check: "" }, { check: "has space" }, { check: "x".repeat(257) }]) {
    await assertRejects(() => deliver(taskCompleted, { method: "GET", query, headers: {} }));
  }
});

test("onfleet: a method other than GET/POST is refused", async () => {
  await assertRejects(() => deliver(taskCompleted, { method: "PUT" }));
});

test("onfleet: onSubscribe removes leftovers, registers the callback URL for the trigger id, stores its id", async () => {
  const m = mockCtx([
    { body: [{ id: "old", url: callbackUrl }, { id: "other", url: "https://elsewhere.test/x" }] },
    { status: 200, body: "" },
    { body: { id: "wh_new", url: callbackUrl, trigger: 3 } },
  ]);
  const state = await taskCompleted.onSubscribe!(
    {
      params: { signingSecret: SECRET },
      callbackUrl,
      subscriptionId: "sub",
      hostUrl: "https://h",
    },
    m.ctx,
  );
  assertEquals(state, { webhookId: "wh_new", trigger: 3 });
  assertEquals(m.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://onfleet.com/api/v2/webhooks"],
    ["DELETE", "https://onfleet.com/api/v2/webhooks/old"],
    ["POST", "https://onfleet.com/api/v2/webhooks"],
  ]);
  assertEquals(JSON.parse(m.calls[2].body!), {
    url: callbackUrl,
    name: "w6w taskCompleted",
    trigger: 3,
  });
});

test("onfleet: onSubscribe refuses an unusable secret before any vendor call", async () => {
  for (const signingSecret of [undefined, "", "xyz"]) {
    const m = mockCtx();
    await assertRejects(() =>
      taskCompleted.onSubscribe!(
        { params: { signingSecret }, callbackUrl, subscriptionId: "sub", hostUrl: "https://h" },
        m.ctx,
      )
    );
    assertEquals(m.calls.length, 0);
  }
});

test("onfleet: onUnsubscribe deletes the webhook and treats 404/410 as already gone", async () => {
  const m = mockCtx([{ status: 200, body: "" }]);
  await taskCompleted.onUnsubscribe!(
    { params: {}, state: { webhookId: "wh_new", trigger: 3 }, subscriptionId: "sub" },
    m.ctx,
  );
  assertEquals(m.calls.map((c) => [c.method, c.url]), [[
    "DELETE",
    "https://onfleet.com/api/v2/webhooks/wh_new",
  ]]);
  for (const status of [404, 410]) {
    await taskCompleted.onUnsubscribe!(
      { params: {}, state: { webhookId: "gone", trigger: 3 }, subscriptionId: "sub" },
      mockCtx([{ status, body: { message: "gone" } }]).ctx,
    );
  }
  await assertRejects(() =>
    taskCompleted.onUnsubscribe!(
      { params: {}, state: { webhookId: "x", trigger: 3 }, subscriptionId: "sub" },
      mockCtx([{ status: 500, body: { message: "boom" } }]).ctx,
    )
  );
});

test("onfleet: every trigger declares output, a sample and a secret-typed signing parameter", () => {
  for (
    const t of [taskCreated, taskStarted, taskCompleted, taskFailed, taskAssigned, taskUpdated]
  ) {
    assertEquals(Array.isArray(t.output) && t.output.length > 0, true);
    assertEquals(t.sample !== undefined, true);
    const p = t.params!.find((x) => x.key === "signingSecret");
    assertEquals([p?.type, p?.required], ["secret", true]);
  }
});
