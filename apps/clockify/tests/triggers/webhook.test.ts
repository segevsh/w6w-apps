import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newTimeEntry from "../../triggers/new-time-entry.ts";
import timerStarted from "../../triggers/timer-started.ts";
import timerStopped from "../../triggers/timer-stopped.ts";
import newProject from "../../triggers/new-project.ts";
import newClient from "../../triggers/new-client.ts";
import newTask from "../../triggers/new-task.ts";

const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.c2lnbmF0dXJl";
const WS = "64a687e29ae1f428e7ebe303";
const callbackUrl = "https://hooks.example.test/clockify/sub_1";
const state = {
  webhookId: "76a687e29ae1f428e7ebe101",
  workspaceId: WS,
  authToken: TOKEN,
  webhookEvent: "NEW_TIME_ENTRY",
};

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Non-canonical whitespace: JSON.stringify(JSON.parse(raw)) !== raw.
const RAW = `{ "id" : "te1",\n  "description":"Writing docs" , "workspaceId": "${WS}",
  "timeInterval" : { "start":"2026-11-09T12:00:00Z" , "end" : null } }`;
assertEquals(JSON.stringify(JSON.parse(RAW)) !== RAW, true);

const ingest = async (
  trigger: typeof newTimeEntry,
  over: {
    headers?: Record<string, string>;
    rawBody?: string | undefined;
    state?: unknown;
  } = {},
) =>
  await trigger.handleIngest!({
    raw: {
      method: "POST",
      path: "",
      query: {},
      headers: "headers" in over ? over.headers! : { "clockify-signature": TOKEN },
      body: null,
      ...("rawBody" in over ? { rawBody: over.rawBody } : { rawBody: RAW }),
    },
    params: {},
    state: ("state" in over ? over.state : state) as typeof state,
    subscriptionId: "sub",
  }, mockCtx().ctx);

test("clockify: a delivery with the stored token in Clockify-Signature becomes one event", async () => {
  const events = evs(await ingest(newTimeEntry));
  assertEquals(events, [{
    id: "te1",
    description: "Writing docs",
    workspaceId: WS,
    timeInterval: { start: "2026-11-09T12:00:00Z", end: null },
  }]);
});

test("clockify: a wrong, truncated, extended or flipped token is refused and never echoed", async () => {
  const flipped = (TOKEN[0] === "e" ? "f" : "e") + TOKEN.slice(1);
  for (const token of [flipped, TOKEN.slice(1), TOKEN + "x", "wrong"]) {
    const err = await assertRejects(() =>
      ingest(newTimeEntry, { headers: { "clockify-signature": token } })
    );
    assertEquals(err.message.includes(TOKEN), false);
    assertEquals(err.message.includes(token), false);
  }
});

test("clockify: a missing or empty signature header, or an absent raw body, is refused", async () => {
  await assertRejects(() => ingest(newTimeEntry, { headers: {} }));
  await assertRejects(() => ingest(newTimeEntry, { headers: { "clockify-signature": "" } }));
  const err = await assertRejects(() => ingest(newTimeEntry, { rawBody: undefined }));
  assertEquals(err.message.includes("raw body"), true);
});

test("clockify: an unset or empty stored token refuses even an absent or empty header", async () => {
  for (
    const s of [undefined, {}, { ...state, authToken: "" }, { ...state, authToken: undefined }]
  ) {
    for (const headers of [{}, { "clockify-signature": "" }, { "clockify-signature": TOKEN }]) {
      const err = await assertRejects(() => ingest(newTimeEntry, { state: s, headers }));
      assertEquals(err.message.includes("secret"), true);
    }
  }
});

test("clockify: a verified non-JSON or non-object body is refused", async () => {
  await assertRejects(() => ingest(newTimeEntry, { rawBody: "not json" }));
  await assertRejects(() => ingest(newTimeEntry, { rawBody: "[1]" }));
});

test("clockify: a verified delivery whose event-type header names another event is dropped", async () => {
  const headers = {
    "clockify-signature": TOKEN,
    "clockify-webhook-event-type": "NEW_TIMER_STARTED",
  };
  assertEquals(evs(await ingest(newTimeEntry, { headers })), []);
  assertEquals(evs(await ingest(timerStarted, { headers })).length, 1);
  assertEquals(evs(await ingest(timerStopped, { headers })), []);
});

test("clockify: onSubscribe creates a workspace webhook for the event and stores the token Clockify returned", async () => {
  const m = mockCtx([
    {
      body: { webhooks: [{ id: "old", url: callbackUrl }, { id: "other", url: "https://x.test" }] },
    },
    { status: 204 },
    { status: 201, body: { id: state.webhookId, authToken: TOKEN, enabled: true } },
  ]);
  const got = await timerStarted.onSubscribe!(
    { params: { workspaceId: WS }, callbackUrl, subscriptionId: "sub", hostUrl: "https://h" },
    m.ctx,
  );
  assertEquals(m.calls.map((c) => [c.method, c.url]), [
    ["GET", `https://api.clockify.me/api/v1/workspaces/${WS}/webhooks`],
    ["DELETE", `https://api.clockify.me/api/v1/workspaces/${WS}/webhooks/old`],
    ["POST", `https://api.clockify.me/api/v1/workspaces/${WS}/webhooks`],
  ]);
  assertEquals(JSON.parse(m.calls[2].body!), {
    name: "w6w timer-started",
    url: callbackUrl,
    webhookEvent: "NEW_TIMER_STARTED",
    triggerSourceType: "WORKSPACE_ID",
    triggerSource: [WS],
  });
  assertEquals(got, {
    webhookId: state.webhookId,
    workspaceId: WS,
    authToken: TOKEN,
    webhookEvent: "NEW_TIMER_STARTED",
  });
});

test("clockify: onSubscribe uses the account's only workspace, and an array listing works too", async () => {
  const m = mockCtx([
    { body: [{ id: WS, name: "Mine" }] },
    { body: [] },
    { body: { id: "w1", authToken: TOKEN } },
  ]);
  await newProject.onSubscribe!(
    { params: {}, callbackUrl, subscriptionId: "s", hostUrl: "h" },
    m.ctx,
  );
  assertEquals(m.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://api.clockify.me/api/v1/workspaces"],
    ["GET", `https://api.clockify.me/api/v1/workspaces/${WS}/webhooks`],
    ["POST", `https://api.clockify.me/api/v1/workspaces/${WS}/webhooks`],
  ]);
  assertEquals(JSON.parse(m.calls[2].body!).webhookEvent, "NEW_PROJECT");
});

test("clockify: onSubscribe refuses an ambiguous workspace and a response without a token", async () => {
  await assertRejects(() =>
    newClient.onSubscribe!(
      { params: {}, callbackUrl, subscriptionId: "s", hostUrl: "h" },
      mockCtx([{ body: [{ id: "a" }, { id: "b" }] }]).ctx,
    )
  );
  await assertRejects(() =>
    newTask.onSubscribe!(
      { params: { workspaceId: WS }, callbackUrl, subscriptionId: "s", hostUrl: "h" },
      mockCtx([{ body: [] }, { body: { id: "w1" } }]).ctx,
    )
  );
});

test("clockify: onUnsubscribe deletes the webhook and treats 404/410 as already gone", async () => {
  const m = mockCtx([{ status: 204 }]);
  await newTimeEntry.onUnsubscribe!({ params: {}, state, subscriptionId: "sub" }, m.ctx);
  assertEquals(m.calls.map((c) => [c.method, c.url]), [[
    "DELETE",
    `https://api.clockify.me/api/v1/workspaces/${WS}/webhooks/${state.webhookId}`,
  ]]);
  for (const status of [404, 410]) {
    await newTimeEntry.onUnsubscribe!(
      { params: {}, state, subscriptionId: "sub" },
      mockCtx([{ status, body: { message: "gone" } }]).ctx,
    );
  }
  await assertRejects(() =>
    newTimeEntry.onUnsubscribe!(
      { params: {}, state, subscriptionId: "sub" },
      mockCtx([{ status: 500, body: {} }]).ctx,
    )
  );
});

test("clockify: every trigger declares output and a sample", () => {
  for (const t of [newTimeEntry, timerStarted, timerStopped, newProject, newClient, newTask]) {
    assertEquals(Array.isArray(t.output) && t.output.length > 0, true);
    assertEquals(t.sample !== undefined, true);
  }
});
