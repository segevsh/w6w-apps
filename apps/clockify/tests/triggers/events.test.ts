import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import timeEntryUpdated from "../../triggers/time-entry-updated.ts";
import timeEntryDeleted from "../../triggers/time-entry-deleted.ts";
import projectUpdated from "../../triggers/project-updated.ts";
import projectDeleted from "../../triggers/project-deleted.ts";
import clientUpdated from "../../triggers/client-updated.ts";
import clientDeleted from "../../triggers/client-deleted.ts";
import taskUpdated from "../../triggers/task-updated.ts";
import taskDeleted from "../../triggers/task-deleted.ts";
import anyEvent from "../../triggers/any-event.ts";
import { CLOCKIFY_EVENTS } from "../../lib/triggers.ts";
import newWorkspace from "../../triggers/new-workspace.ts";

const TOKEN = "tok-abcdefghijklmnop-0123456789";
const TOKEN2 = "tok-qrstuvwxyz-9876543210-zz";
const WS = "64a687e29ae1f428e7ebe303";
const callbackUrl = "https://hooks.example.test/clockify/sub_2";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const RAW = `{ "id" : "r1",\n  "name":"Thing" , "workspaceId": "${WS}" }`;
assertEquals(JSON.stringify(JSON.parse(RAW)) !== RAW, true);

const NAMED = [
  [timeEntryUpdated, "TIME_ENTRY_UPDATED"],
  [timeEntryDeleted, "TIME_ENTRY_DELETED"],
  [projectUpdated, "PROJECT_UPDATED"],
  [projectDeleted, "PROJECT_DELETED"],
  [clientUpdated, "CLIENT_UPDATED"],
  [clientDeleted, "CLIENT_DELETED"],
  [taskUpdated, "TASK_UPDATED"],
  [taskDeleted, "TASK_DELETED"],
] as const;

// deno-lint-ignore no-explicit-any
const ingest = async (t: any, state: unknown, over: Record<string, unknown> = {}) =>
  await t.handleIngest!({
    raw: {
      method: "POST",
      path: "",
      query: {},
      headers: { "clockify-signature": TOKEN },
      body: null,
      rawBody: RAW,
      ...over,
    },
    params: {},
    state,
    subscriptionId: "sub",
  }, mockCtx().ctx);

/** Flip one character at the start, the middle and the end of the token. */
const flips = (tok: string) =>
  [0, Math.floor(tok.length / 2), tok.length - 1].map((i) =>
    tok.slice(0, i) + (tok[i] === "a" ? "b" : "a") + tok.slice(i + 1)
  );

for (const [t, event] of NAMED) {
  const state = { webhookId: "w1", workspaceId: WS, authToken: TOKEN, webhookEvent: event };
  test(`clockify ${t.key}: verifies the token, registers ${event}, refuses bad deliveries`, async () => {
    assertEquals(evs(await ingest(t, state)), [JSON.parse(RAW)]);
    for (const bad of flips(TOKEN)) {
      const err = await assertRejects(() =>
        ingest(t, state, { headers: { "clockify-signature": bad } })
      );
      assertEquals(err.message.includes(bad) || err.message.includes(TOKEN), false);
    }
    await assertRejects(() => ingest(t, state, { headers: {} }));
    const raw = await assertRejects(() => ingest(t, state, { rawBody: undefined }));
    assertEquals(raw.message.includes("raw body"), true);
    for (const s of [undefined, { ...state, authToken: "" }]) {
      const err = await assertRejects(() =>
        ingest(t, s, { headers: { "clockify-signature": "" } })
      );
      assertEquals(err.message.includes("secret"), true);
    }
    // a verified delivery for another event is dropped, the registered one passes
    const other = { "clockify-signature": TOKEN, "clockify-webhook-event-type": "NEW_TAG" };
    assertEquals(evs(await ingest(t, state, { headers: other })), []);
    const mine = { "clockify-signature": TOKEN, "clockify-webhook-event-type": event };
    assertEquals(evs(await ingest(t, state, { headers: mine })).length, 1);

    const m = mockCtx([{ body: [] }, { status: 201, body: { id: "w1", authToken: TOKEN } }]);
    await t.onSubscribe!(
      { params: { workspaceId: WS }, callbackUrl, subscriptionId: "s", hostUrl: "h" },
      m.ctx,
    );
    assertEquals(m.calls.map((c) => [c.method, c.url]), [
      ["GET", `https://api.clockify.me/api/v1/workspaces/${WS}/webhooks`],
      ["POST", `https://api.clockify.me/api/v1/workspaces/${WS}/webhooks`],
    ]);
    assertEquals(JSON.parse(m.calls[1].body!).webhookEvent, event);
    assertEquals(t.output.length > 0 && t.sample !== undefined, true);
  });
}

const anyState = {
  workspaceId: WS,
  webhooks: [
    { id: "w1", authToken: TOKEN, event: "NEW_TAG" },
    { id: "w2", authToken: TOKEN2, event: "NEW_INVOICE" },
  ],
};

test("clockify any-event: one webhook per named event, each with its own token", async () => {
  const m = mockCtx([
    { body: [] },
    { status: 201, body: { id: "w1", authToken: TOKEN } },
    { status: 201, body: { id: "w2", authToken: TOKEN2 } },
  ]);
  const got = await anyEvent.onSubscribe!({
    params: { workspaceId: WS, events: "new_tag, NEW_INVOICE,NEW_TAG" },
    callbackUrl,
    subscriptionId: "s",
    hostUrl: "h",
  }, m.ctx);
  assertEquals(m.calls.map((c) => c.method), ["GET", "POST", "POST"]);
  assertEquals(JSON.parse(m.calls[1].body!), {
    name: "w6w 1 NEW_TAG",
    url: callbackUrl,
    webhookEvent: "NEW_TAG",
    triggerSourceType: "WORKSPACE_ID",
    triggerSource: [WS],
  });
  assertEquals(JSON.parse(m.calls[2].body!).webhookEvent, "NEW_INVOICE");
  assertEquals(got, anyState);
});

test("clockify any-event: every catalog event registers under a name Clockify accepts (<= 30)", async () => {
  const all = [...CLOCKIFY_EVENTS];
  const longest = all.reduce((a, b) => (b.length > a.length ? b : a));
  assertEquals(longest.length > 30, true);
  const m = mockCtx([
    { body: [] },
    ...all.map((_, i) => ({
      status: 201,
      body: { id: `w${i}`, authToken: `tok-${i}-abcdefghijklmnop` },
    })),
  ]);
  await anyEvent.onSubscribe!({
    params: { workspaceId: WS, events: all.join(",") },
    callbackUrl,
    subscriptionId: "s",
    hostUrl: "h",
  }, m.ctx);
  const posts = m.calls.filter((c) => c.method === "POST").map((c) => JSON.parse(c.body!));
  assertEquals(posts.length, all.length);
  const names = posts.map((p) => p.name as string);
  for (const n of names) assertEquals(n.length >= 2 && n.length <= 30, true);
  assertEquals(new Set(names).size, all.length);
  assertEquals(posts.find((p) => p.webhookEvent === longest) !== undefined, true);
});

test("clockify any-event: an empty or unknown events list is refused before any call", async () => {
  for (const events of [undefined, "", " , ", "NEW_TAG,NOT_AN_EVENT"]) {
    const m = mockCtx([]);
    await assertRejects(() =>
      anyEvent.onSubscribe!(
        { params: { workspaceId: WS, events }, callbackUrl, subscriptionId: "s", hostUrl: "h" },
        m.ctx,
      )
    );
    assertEquals(m.calls.length, 0);
  }
});

test("clockify any-event: a failed second registration deletes the first", async () => {
  const m = mockCtx([
    { body: [] },
    { status: 201, body: { id: "w1", authToken: TOKEN } },
    { status: 403, body: { message: "limit" } },
    { status: 204 },
  ]);
  await assertRejects(() =>
    anyEvent.onSubscribe!(
      {
        params: { workspaceId: WS, events: "NEW_TAG,NEW_INVOICE" },
        callbackUrl,
        subscriptionId: "s",
        hostUrl: "h",
      },
      m.ctx,
    )
  );
  assertEquals(m.calls[3].method, "DELETE");
  assertEquals(m.calls[3].url, `https://api.clockify.me/api/v1/workspaces/${WS}/webhooks/w1`);
});

test("clockify any-event: onUnsubscribe deletes every webhook", async () => {
  const m = mockCtx([{ status: 204 }, { status: 404, body: {} }]);
  await anyEvent.onUnsubscribe!({ params: {}, state: anyState, subscriptionId: "s" }, m.ctx);
  assertEquals(m.calls.map((c) => [c.method, c.url]), [
    ["DELETE", `https://api.clockify.me/api/v1/workspaces/${WS}/webhooks/w1`],
    ["DELETE", `https://api.clockify.me/api/v1/workspaces/${WS}/webhooks/w2`],
  ]);
});

test("clockify any-event: accepts either stored token, filters by event, refuses a flipped token", async () => {
  const h = (tok: string, ev?: string) => ({
    headers: { "clockify-signature": tok, ...(ev ? { "clockify-webhook-event-type": ev } : {}) },
  });
  assertEquals(evs(await ingest(anyEvent, anyState, h(TOKEN, "NEW_TAG"))), [
    { ...JSON.parse(RAW), webhookEvent: "NEW_TAG" },
  ]);
  assertEquals(evs(await ingest(anyEvent, anyState, h(TOKEN2, "NEW_INVOICE"))).length, 1);
  assertEquals(evs(await ingest(anyEvent, anyState, h(TOKEN, "USER_UPDATED"))), []);
  assertEquals(evs(await ingest(anyEvent, anyState, h(TOKEN))), [JSON.parse(RAW)]);
  for (const base of [TOKEN, TOKEN2]) {
    for (const bad of flips(base)) {
      const err = await assertRejects(() => ingest(anyEvent, anyState, h(bad, "NEW_TAG")));
      assertEquals(err.message.includes(bad), false);
    }
  }
  await assertRejects(() => ingest(anyEvent, anyState, { headers: {} }));
  const raw = await assertRejects(() => ingest(anyEvent, anyState, { rawBody: undefined }));
  assertEquals(raw.message.includes("raw body"), true);
  for (
    const s of [undefined, {}, { workspaceId: WS, webhooks: [] }, {
      workspaceId: WS,
      webhooks: [{ id: "w", authToken: "", event: "NEW_TAG" }],
    }]
  ) {
    const err = await assertRejects(() =>
      ingest(anyEvent, s, { headers: { "clockify-signature": "" } })
    );
    assertEquals(err.message.includes("secret"), true);
  }
});

const WSPACE = (id: string, name = "W") => ({ id, name });

test("clockify new-workspace: seed emits nothing, a new workspace is emitted once", async () => {
  const seed = await newWorkspace.poll!(
    { params: {}, state: {} },
    mockCtx([{ body: [WSPACE("a"), WSPACE("b")] }]).ctx,
  );
  assertEquals(seed.events, []);
  assertEquals((seed.nextState as { seeded?: boolean }).seeded, true);
  const m = () => mockCtx([{ body: [WSPACE("a"), WSPACE("b"), WSPACE("c", "New")] }]);
  const one = await newWorkspace.poll!({ params: {}, state: seed.nextState }, m().ctx);
  assertEquals(one.events, [WSPACE("c", "New")]);
  const again = await newWorkspace.poll!({ params: {}, state: seed.nextState }, m().ctx);
  assertEquals(again, one);
  const mc = m();
  await newWorkspace.poll!({ params: {}, state: seed.nextState }, mc.ctx);
  assertEquals(mc.calls.map((c) => [c.method, c.url]), [[
    "GET",
    "https://api.clockify.me/api/v1/workspaces",
  ]]);
  const next = await newWorkspace.poll!({ params: {}, state: one.nextState }, m().ctx);
  assertEquals(next.events, []);
});
