import { test } from "node:test";
import nodeAssert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import userJoined from "../../triggers/user-joined.ts";
import userUpdated from "../../triggers/user-updated.ts";
import threadCreated from "../../triggers/thread-created.ts";
import groupJoined from "../../triggers/group-joined.ts";
import eventCreated from "../../triggers/event-created.ts";
import eventRsvp from "../../triggers/event-rsvp.ts";
import courseCompleted from "../../triggers/course-completed.ts";
import documentCreated from "../../triggers/document-created.ts";

// The generated _assert.ts has no assertRejects: same contract, on node:assert.
async function assertRejects(fn: () => Promise<unknown>, _cls: unknown, includes: string) {
  await nodeAssert.rejects(fn, (e: unknown) => e instanceof Error && e.message.includes(includes));
}

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const UUID = "e6ccb009-ad46-4b09-a6e9-1412d9ff0601";

// Each case: the trigger, the filter params the user sets, the exact PUT /webhooks body the
// Heartbeat reference documents for it, and a documented delivery payload.
const cases = [
  {
    t: userJoined,
    action: "USER_JOIN",
    params: {},
    name: { name: "USER_JOIN" },
    payload: { id: UUID, name: "Ada", email: "ada@example.com" },
  },
  {
    t: userUpdated,
    action: "USER_UPDATE",
    params: {},
    name: { name: "USER_UPDATE" },
    payload: { id: UUID },
  },
  {
    t: threadCreated,
    action: "THREAD_CREATE",
    params: { channelId: " ch-1 " },
    name: { name: "THREAD_CREATE", filter: { channelID: "ch-1" } },
    payload: { id: UUID, channelID: "ch-1" },
  },
  {
    t: groupJoined,
    action: "GROUP_JOIN",
    params: { groupId: "g-1" },
    name: { name: "GROUP_JOIN", filter: { groupID: "g-1" } },
    payload: { userID: UUID, groupID: "g-1" },
  },
  {
    t: eventCreated,
    action: "EVENT_CREATE",
    params: {},
    name: { name: "EVENT_CREATE" },
    payload: { id: UUID },
  },
  {
    t: eventRsvp,
    action: "EVENT_RSVP",
    params: { eventId: "ev-1", userType: "GUEST" },
    name: { name: "EVENT_RSVP", filter: { userType: "GUEST", eventID: "ev-1" } },
    payload: { eventID: "ev-1", email: "ada@example.com", userID: null },
  },
  {
    t: courseCompleted,
    action: "COURSE_COMPLETED",
    params: { courseId: "c-1" },
    name: { name: "COURSE_COMPLETED", filter: { courseID: "c-1" } },
    payload: { courseID: "c-1", courseName: "Intro", userID: UUID },
  },
  {
    t: documentCreated,
    action: "DOCUMENT_CREATE",
    params: {},
    name: { name: "DOCUMENT_CREATE" },
    payload: { id: UUID },
  },
];

const call = (body: unknown, method = "POST", rawBody?: string) => ({
  raw: {
    method,
    path: "/",
    query: {},
    headers: {} as Record<string, string>,
    body,
    ...(rawBody === undefined ? {} : { rawBody }),
  },
  params: {},
  state: { webhookId: UUID },
  subscriptionId: "sub_1",
});

test("app declares the eight original webhook triggers first, with output and sample, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key).slice(0, 8), [
    "user-joined",
    "user-updated",
    "thread-created",
    "group-joined",
    "event-created",
    "event-rsvp",
    "course-completed",
    "document-created",
  ]);
  for (const { t } of cases) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
  }
});

for (const { t, action, params, name, payload } of cases) {
  test(`${action}: onSubscribe PUTs the documented action body to /webhooks, keeps the id`, async () => {
    const { ctx, calls } = mockCtx([{ body: { id: UUID } }]);
    const state = await t.onSubscribe!(
      { params, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
      ctx,
    );
    assertEquals(state, { webhookId: UUID });
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, "PUT");
    assertEquals(new URL(calls[0].url).pathname, "/v0/webhooks");
    assertEquals(JSON.parse(calls[0].body!), { action: name, url: CALLBACK });
  });

  test(`${action}: a delivery is parsed into one event beside the action name`, async () => {
    const out = evs(await t.handleIngest!(call(payload), mockCtx().ctx)) as Array<
      Record<string, unknown>
    >;
    assertEquals(out, [{ action, ...payload }]);
  });

  test(`${action}: a JSON text body is parsed too`, async () => {
    const text = JSON.stringify(payload, null, 2);
    const out = evs(await t.handleIngest!(call(text), mockCtx().ctx));
    assertEquals(out, [{ action, ...payload }]);
  });
}

test("a required filter left empty fails the subscribe before any request", async () => {
  for (
    const [t, label] of [[threadCreated, "channel"], [groupJoined, "group"], [
      courseCompleted,
      "course",
    ]] as const
  ) {
    const { ctx, calls } = mockCtx([]);
    await assertRejects(
      () =>
        t.onSubscribe!(
          { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
          ctx,
        ),
      Error,
      label,
    );
    assertEquals(calls.length, 0);
  }
});

test("EVENT_RSVP with no filters registers the action without a filter object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: UUID } }]);
  await eventRsvp.onSubscribe!(
    { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { action: { name: "EVENT_RSVP" }, url: CALLBACK });
});

test("onSubscribe fails when Heartbeat returns no webhook id", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  await assertRejects(
    () =>
      userJoined.onSubscribe!({
        params: {},
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "",
      }, ctx),
    Error,
    "webhook id",
  );
});

test("onUnsubscribe DELETEs /webhooks/{id}; 404 counts as gone, other errors propagate", async () => {
  const state = { webhookId: UUID };
  const ok = mockCtx([{ body: {} }]);
  await userJoined.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, ok.ctx);
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(new URL(ok.calls[0].url).pathname, `/v0/webhooks/${UUID}`);

  const gone = mockCtx([{ status: 404, body: { message: "Not found" } }]);
  await userJoined.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, gone.ctx);

  const boom = mockCtx([{ status: 500, body: { message: "boom" } }]);
  await assertRejects(
    () => userJoined.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, boom.ctx),
    Error,
    "Heartbeat 500",
  );

  const none = mockCtx([]);
  await userJoined.onUnsubscribe!({ params: {}, state: undefined, subscriptionId: "s" }, none.ctx);
  assertEquals(none.calls.length, 0);
});

test("a GET, an array body or non-JSON text is refused", async () => {
  const ctx = mockCtx().ctx;
  await assertRejects(
    async () => await userJoined.handleIngest!(call({ id: UUID }, "GET"), ctx),
    Error,
    "POST",
  );
  await assertRejects(
    async () => await userJoined.handleIngest!(call([1, 2]), ctx),
    Error,
    "JSON object",
  );
  await assertRejects(
    async () => await userJoined.handleIngest!(call("not json"), ctx),
    Error,
    "not JSON",
  );
});

test("the trigger declares no secret param: Heartbeat does not sign, so the URL is the secret", () => {
  for (const { t } of cases) assert(!(t.params ?? []).some((p) => p.type === "secret"));
  const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
  assert(readme.includes("Heartbeat does not sign its webhooks"));
  assert(readme.includes("callback URL is the secret"));
});
