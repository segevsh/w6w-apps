import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import taskDeleted from "../../triggers/task-deleted.ts";
import taskUnassigned from "../../triggers/task-unassigned.ts";
import taskCloned from "../../triggers/task-cloned.ts";
import taskEta from "../../triggers/task-eta.ts";
import taskArrival from "../../triggers/task-arrival.ts";
import taskDelayed from "../../triggers/task-delayed.ts";
import workerDuty from "../../triggers/worker-duty.ts";
import workerCreated from "../../triggers/worker-created.ts";
import workerDeleted from "../../triggers/worker-deleted.ts";
import workerUpdated from "../../triggers/worker-updated.ts";
import smsMissed from "../../triggers/sms-recipient-response-missed.ts";
import smsOptOut from "../../triggers/sms-recipient-opt-out.ts";
import anyEvent from "../../triggers/any-event.ts";
import newTeam from "../../triggers/new-team.ts";
import newHub from "../../triggers/new-hub.ts";
import { resolveEvents } from "../../lib/triggers.ts";

// A hex secret like the dashboard shows. Test-only value.
const SECRET = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
const callbackUrl = "https://hooks.example.test/onfleet/sub_1";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Independent of app code: node:crypto, key = the secret's hex-decoded bytes
// (https://docs.onfleet.com/reference/secrets, 2026-11-10).
const sign = (raw: string) =>
  createHmac("sha512", Buffer.from(SECRET, "hex")).update(raw).digest("hex");
// Flip the last hex digit of a signature.
const flip = (sig: string) => sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");

// One row per signed trigger. `raw` has non-canonical whitespace (JSON.stringify(JSON.parse(raw)) !== raw).
const cases = [
  {
    t: taskDeleted,
    id: 8,
    raw:
      `{ "triggerId" : 8,\n "triggerName":"taskDeleted", "time": 1763467200000 ,"taskId":"t1",\n "data" : { "task": { "id": "t1" } } }`,
    check: { taskId: "t1", task: { id: "t1" }, triggerName: "taskDeleted" },
  },
  {
    t: taskUnassigned,
    id: 10,
    raw:
      `{ "triggerId":10 ,"triggerName" :"taskUnassigned", "time":1763467200000, "taskId":"t1","workerId":"w1" ,\n"data":{"task":{"id":"t1"}} }`,
    check: { taskId: "t1", workerId: "w1", task: { id: "t1" } },
  },
  {
    t: taskCloned,
    id: 13,
    raw:
      `{ "triggerId":13 ,"triggerName" :"taskCloned", "time":1763467200000, "taskId":"t2" ,\n"data":{"task":{"id":"t2"}} }`,
    check: { taskId: "t2", task: { id: "t2" } },
  },
  {
    t: taskEta,
    id: 1,
    raw:
      `{ "triggerId":1 ,"triggerName" :"taskEta", "time":1763467200000, "taskId":"t1", "etaSeconds" : 300 ,\n"data":{"task":{"id":"t1"}} }`,
    check: { taskId: "t1", etaSeconds: 300 },
  },
  {
    t: taskArrival,
    id: 2,
    raw:
      `{ "triggerId":2 ,"triggerName" :"taskArrival", "time":1763467200000, "taskId":"t1", "distance" : 150 ,\n"data":{"task":{"id":"t1"}} }`,
    check: { taskId: "t1", distance: 150 },
  },
  {
    t: taskDelayed,
    id: 12,
    raw:
      `{ "triggerId":12 ,"triggerName" :"taskDelayed", "time":1763467200000, "taskId":"t1", "delay" : 600 ,\n"data":{"task":{"id":"t1"}} }`,
    check: { taskId: "t1", delay: 600 },
  },
  {
    t: workerDuty,
    id: 5,
    raw:
      `{ "triggerId":5 ,"triggerName" :"workerDuty", "time":1763467200000, "workerId":"w1", "status" : 1 ,\n"data":{"worker":{"id":"w1"}} }`,
    check: { workerId: "w1", status: 1, worker: { id: "w1" } },
  },
  {
    t: workerCreated,
    id: 15,
    raw:
      `{ "triggerId":15 ,"triggerName" :"workerCreated", "time":1763467200000, "workerId":"w1", "adminId":"a1" ,\n"data":{"worker":{"id":"w1"}} }`,
    check: { workerId: "w1", adminId: "a1", worker: { id: "w1" } },
  },
  {
    t: workerDeleted,
    id: 16,
    raw:
      `{ "triggerId":16 ,"triggerName" :"workerDeleted", "time":1763467200000, "workerId":"w1", "adminId":"a1" ,\n"data":{"worker":{"id":"w1"}} }`,
    check: { workerId: "w1", worker: { id: "w1" } },
  },
  {
    t: workerUpdated,
    id: 25,
    raw:
      `{ "triggerId":25 ,"triggerName" :"workerUpdated", "time":1763467200000, "workerId":"w1", "adminId":"a1" ,\n"data":{"worker":{"id":"w1","name":"N"}} }`,
    check: { workerId: "w1", worker: { id: "w1", name: "N" } },
  },
  {
    t: smsMissed,
    id: 14,
    raw:
      `{ "triggerId":14 ,"triggerName" :"smsRecipientResponseMissed", "time":1763467200000,\n "from":"+15555550100", "to" : "+15555550199" ,"body":"Hi" }`,
    check: { from: "+15555550100", to: "+15555550199", body: "Hi" },
  },
  {
    t: smsOptOut,
    id: 17,
    raw:
      `{ "triggerId":17 ,"triggerName" :"SMSRecipientOptOut", "time":1763467200000,\n "recipient":{"id":"r1"} }`,
    check: { recipient: { id: "r1" } },
  },
];

const deliver = (
  trigger: { handleIngest?: unknown },
  over: {
    method?: string;
    query?: Record<string, string>;
    headers?: Record<string, string>;
    rawBody?: string | undefined;
    params?: Record<string, unknown>;
  },
  raw: string,
) =>
  // deno-lint-ignore no-explicit-any
  (trigger as any).handleIngest({
    raw: {
      method: over.method ?? "POST",
      path: "",
      query: over.query ?? {},
      headers: "headers" in over ? over.headers! : { "x-onfleet-signature": sign(raw) },
      body: null,
      ...("rawBody" in over ? { rawBody: over.rawBody } : { rawBody: raw }),
    },
    params: over.params ?? { signingSecret: SECRET },
    state: {},
    subscriptionId: "sub",
  }, mockCtx().ctx);

for (const { t, id, raw, check } of cases) {
  test(`onfleet ${t.key}: signed delivery → one event; tampered signature/body, missing header or rawBody, unset secret → refused`, async () => {
    assertEquals(JSON.stringify(JSON.parse(raw)) !== raw, true);
    const out = evs(await deliver(t, {}, raw)) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].triggerId, id);
    for (const [k, v] of Object.entries(check)) assertEquals(out[0][k], v);
    assertEquals((out[0].delivery as { triggerId: number }).triggerId, id);

    // one flipped byte of the SIGNATURE itself
    await assertRejects(() =>
      deliver(t, { headers: { "x-onfleet-signature": flip(sign(raw)) } }, raw)
    );
    // a signature for the original body no longer matches a body with one changed byte
    await assertRejects(() =>
      deliver(t, { rawBody: raw.replace('"triggerId"', '"triggerld"') }, raw)
    );
    // a signature over the re-serialised body is not the raw-bytes signature
    await assertRejects(() =>
      deliver(t, { headers: { "x-onfleet-signature": sign(JSON.stringify(JSON.parse(raw))) } }, raw)
    );
    // missing / empty header, absent raw body
    await assertRejects(() => deliver(t, { headers: {} }, raw));
    await assertRejects(() => deliver(t, { headers: { "x-onfleet-signature": "" } }, raw));
    await assertRejects(() => deliver(t, { rawBody: undefined }, raw));
    // requireSecret first: an unset secret never matches an absent/empty signature
    for (const signingSecret of [undefined, ""]) {
      await assertRejects(() => deliver(t, { params: { signingSecret }, headers: {} }, raw));
      await assertRejects(() =>
        deliver(t, { params: { signingSecret }, headers: { "x-onfleet-signature": "" } }, raw)
      );
    }
    // a verified delivery for another trigger id is dropped
    const other = raw.replace(/"triggerId"\s*:\s*\d+/, '"triggerId": 99');
    assertEquals(
      evs(
        await deliver(t, { headers: { "x-onfleet-signature": sign(other) }, rawBody: other }, raw),
      ),
      [],
    );
  });
}

test("onfleet: the ?check= handshake works for the new triggers too", async () => {
  const r = await deliver(
    workerCreated,
    { method: "GET", query: { check: "abc123" }, headers: {} },
    "",
  );
  assertEquals((r as { response: { body: string; status: number } }).response, {
    status: 200,
    headers: { "content-type": "text/plain" },
    body: "abc123",
  });
});

test("onfleet: onSubscribe registers the trigger id; threshold triggers send the threshold", async () => {
  const sub = (t: typeof taskEta, params: Record<string, unknown>, m: ReturnType<typeof mockCtx>) =>
    t.onSubscribe!({ params, callbackUrl, subscriptionId: "sub", hostUrl: "https://h" }, m.ctx);

  const m = mockCtx([{ body: [] }, { body: { id: "wh_eta", url: callbackUrl, trigger: 1 } }]);
  assertEquals(await sub(taskEta, { signingSecret: SECRET, threshold: 300 }, m), {
    webhookId: "wh_eta",
    trigger: 1,
  });
  assertEquals(m.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://onfleet.com/api/v2/webhooks"],
    ["POST", "https://onfleet.com/api/v2/webhooks"],
  ]);
  assertEquals(JSON.parse(m.calls[1].body!), {
    url: callbackUrl,
    name: "w6w taskEta",
    trigger: 1,
    threshold: 300,
  });

  const m2 = mockCtx([{ body: [] }, { body: { id: "wh_w", url: callbackUrl, trigger: 15 } }]);
  assertEquals(
    await sub(workerCreated as unknown as typeof taskEta, { signingSecret: SECRET }, m2),
    {
      webhookId: "wh_w",
      trigger: 15,
    },
  );
  assertEquals(JSON.parse(m2.calls[1].body!), {
    url: callbackUrl,
    name: "w6w workerCreated",
    trigger: 15,
  });

  // a threshold trigger refuses a missing/zero/negative threshold before any vendor call
  for (const threshold of [undefined, 0, -5, "x"]) {
    const m3 = mockCtx();
    await assertRejects(() =>
      sub(taskArrival as unknown as typeof taskEta, { signingSecret: SECRET, threshold }, m3)
    );
    assertEquals(m3.calls.length, 0);
  }
  // and an unusable secret
  for (const signingSecret of [undefined, "", "xyz"]) {
    const m4 = mockCtx();
    await assertRejects(() =>
      sub(workerDeleted as unknown as typeof taskEta, { signingSecret }, m4)
    );
    assertEquals(m4.calls.length, 0);
  }
});

test("onfleet: onUnsubscribe deletes the webhook; 404/410 mean already gone", async () => {
  const m = mockCtx([{ status: 200, body: "" }]);
  await workerUpdated.onUnsubscribe!(
    { params: {}, state: { webhookId: "wh_x", trigger: 25 }, subscriptionId: "sub" },
    m.ctx,
  );
  assertEquals(m.calls.map((c) => [c.method, c.url]), [[
    "DELETE",
    "https://onfleet.com/api/v2/webhooks/wh_x",
  ]]);
  await workerUpdated.onUnsubscribe!(
    { params: {}, state: { webhookId: "gone", trigger: 25 }, subscriptionId: "sub" },
    mockCtx([{ status: 404, body: { message: "gone" } }]).ctx,
  );
});

test("onfleet: every new webhook trigger declares output, a sample and a secret-typed signing parameter", () => {
  for (const t of [...cases.map((c) => c.t), anyEvent]) {
    assertEquals(Array.isArray(t.output) && t.output.length > 0, true);
    assertEquals(t.sample !== undefined, true);
    const p = t.params!.find((x) => x.key === "signingSecret");
    assertEquals([p?.type, p?.required], ["secret", true]);
  }
});

// ---- Any event ----------------------------------------------------------------------------------

const ANY_RAW =
  `{ "triggerId" : 22,\n "triggerName":"routePlanCreated", "time": 1763467200000 ,"routePlanId":"rp1",\n "data":{"routePlan":{"id":"rp1"}} }`;
const anyDeliver = (events: unknown, raw = ANY_RAW, sig = sign(raw)) =>
  deliver(anyEvent, {
    params: { signingSecret: SECRET, events },
    headers: { "x-onfleet-signature": sig },
  }, raw);

test("onfleet any-event: filter — empty = all unthresholded events; a list keeps only those", async () => {
  const all = evs(await anyDeliver("")) as Array<Record<string, unknown>>;
  assertEquals(all.length, 1);
  assertEquals([all[0].triggerId, all[0].routePlanId], [22, "rp1"]);
  assertEquals(evs(await anyDeliver("routePlanCreated, workerCreated")).length, 1);
  assertEquals(evs(await anyDeliver("22")).length, 1);
  assertEquals(evs(await anyDeliver("workerCreated,taskDeleted")), []);
});

test("onfleet any-event: flipped signature byte, missing header/rawBody, unset secret → refused", async () => {
  await assertRejects(() => anyDeliver("", ANY_RAW, flip(sign(ANY_RAW))));
  await assertRejects(() => deliver(anyEvent, { headers: {} }, ANY_RAW));
  await assertRejects(() => deliver(anyEvent, { rawBody: undefined }, ANY_RAW));
  for (const signingSecret of [undefined, ""]) {
    await assertRejects(() =>
      deliver(anyEvent, { params: { signingSecret }, headers: {} }, ANY_RAW)
    );
  }
});

test("onfleet any-event: resolveEvents — names (any case) and ids; threshold or unknown names throw", () => {
  assertEquals(resolveEvents("taskStarted, 15 ,WORKERCREATED"), [0, 15]);
  assertEquals(resolveEvents("").length, 25);
  assertEquals(resolveEvents(undefined).includes(1), false);
  for (const bad of ["taskEta", "2", "nope"]) {
    let threw = false;
    try {
      resolveEvents(bad);
    } catch {
      threw = true;
    }
    assertEquals(threw, true);
  }
});

test("onfleet any-event: onSubscribe registers one webhook per chosen event; unsubscribe deletes each", async () => {
  const m = mockCtx([
    { body: [{ id: "old", url: callbackUrl }] },
    { status: 200, body: "" },
    { body: { id: "wh_a" } },
    { body: { id: "wh_b" } },
  ]);
  const state = await anyEvent.onSubscribe!(
    {
      params: { signingSecret: SECRET, events: "workerCreated,taskStarted" },
      callbackUrl,
      subscriptionId: "sub",
      hostUrl: "https://h",
    },
    m.ctx,
  );
  assertEquals(state, {
    webhooks: [{ webhookId: "wh_a", trigger: 0 }, { webhookId: "wh_b", trigger: 15 }],
  });
  assertEquals(m.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://onfleet.com/api/v2/webhooks"],
    ["DELETE", "https://onfleet.com/api/v2/webhooks/old"],
    ["POST", "https://onfleet.com/api/v2/webhooks"],
    ["POST", "https://onfleet.com/api/v2/webhooks"],
  ]);
  assertEquals(JSON.parse(m.calls[2].body!), {
    url: callbackUrl,
    name: "w6w taskStarted",
    trigger: 0,
  });
  assertEquals(JSON.parse(m.calls[3].body!), {
    url: callbackUrl,
    name: "w6w workerCreated",
    trigger: 15,
  });

  const u = mockCtx([{ status: 200, body: "" }, { status: 404, body: { message: "gone" } }]);
  await anyEvent.onUnsubscribe!({ params: {}, state, subscriptionId: "sub" }, u.ctx);
  assertEquals(u.calls.map((c) => [c.method, c.url]), [
    ["DELETE", "https://onfleet.com/api/v2/webhooks/wh_a"],
    ["DELETE", "https://onfleet.com/api/v2/webhooks/wh_b"],
  ]);
});

test("onfleet any-event: a failed registration rolls back the webhooks already created", async () => {
  const m = mockCtx([
    { body: [] },
    { body: { id: "wh_a" } },
    { status: 500, body: { message: "boom" } },
    { status: 200, body: "" },
  ]);
  await assertRejects(() =>
    anyEvent.onSubscribe!(
      {
        params: { signingSecret: SECRET, events: "taskStarted,taskCompleted" },
        callbackUrl,
        subscriptionId: "sub",
        hostUrl: "https://h",
      },
      m.ctx,
    )
  );
  assertEquals(m.calls.map((c) => [c.method, c.url]).at(-1), [
    "DELETE",
    "https://onfleet.com/api/v2/webhooks/wh_a",
  ]);
  // an unusable events list never reaches the vendor
  const m2 = mockCtx();
  await assertRejects(() =>
    anyEvent.onSubscribe!(
      {
        params: { signingSecret: SECRET, events: "taskEta" },
        callbackUrl,
        subscriptionId: "sub",
        hostUrl: "https://h",
      },
      m2.ctx,
    )
  );
  assertEquals(m2.calls.length, 0);
});

// ---- Snapshot polls: new-team, new-hub ----------------------------------------------------------

for (
  const { name, trigger, url, old, fresh } of [
    {
      name: "new-team",
      trigger: newTeam,
      url: "https://onfleet.com/api/v2/teams",
      old: [{ id: "team_one", name: "One" }],
      fresh: { id: "team_two", name: "Two" },
    },
    {
      name: "new-hub",
      trigger: newHub,
      url: "https://onfleet.com/api/v2/hubs",
      old: [{ id: "hub_one", name: "One" }],
      fresh: { id: "hub_two", name: "Two" },
    },
  ]
) {
  const input = { params: {}, subscriptionId: "sub-1" };
  test(`onfleet ${name}: seeds without events, emits only the new record, is idempotent, literal request`, async () => {
    const m = mockCtx([{ body: old }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, m.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    assertEquals(m.calls.map((c) => [c.method, c.url]), [["GET", url]]);

    const a = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: [fresh, ...old] }]).ctx,
    );
    assertEquals(a.events, [fresh]);
    const b = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: [fresh, ...old] }]).ctx,
    );
    assertEquals(b, a);
    const again = await trigger.poll!(
      { ...input, state: a.nextState },
      mockCtx([{ body: [fresh, ...old] }]).ctx,
    );
    assertEquals(again.events, []);
  });
}
