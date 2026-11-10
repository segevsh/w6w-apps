import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import taskDeleted from "../../triggers/task-deleted.ts";
import newComment from "../../triggers/new-comment.ts";
import newProject from "../../triggers/new-project.ts";
import projectUpdated from "../../triggers/project-updated.ts";
import projectDeleted from "../../triggers/project-deleted.ts";
import anyEvent from "../../triggers/any-event.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

const SECRET = "test-secret";
const CALLBACK = "https://w6w.example/triggers/webhooks/sub_1";
const sign = (body: string, key = SECRET) => createHmac("sha256", key).update(body).digest("hex");

/** One delivery with non-canonical whitespace: JSON.stringify(JSON.parse(b)) !== b. */
function bodyFor(
  resourceType: string,
  action: string,
  subtype?: string,
  parentType = "project",
): string {
  const st = subtype ? `, "resource_subtype": "${subtype}"` : "";
  return `{ "events": [ { "user": {"gid": "7", "resource_type": "user"},
  "created_at": "2026-11-10T10:00:00.000Z", "action": "${action}",
  "resource": {"gid": "100", "resource_type": "${resourceType}"${st}},
  "parent": {"gid": "42", "resource_type": "${parentType}"} } ] }`;
}

function call(body: string, over: { headers?: Record<string, string>; rawBody?: string | null }) {
  const rawBody = over.rawBody === null ? undefined : over.rawBody ?? body;
  return {
    method: "POST",
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers: over.headers ?? { "x-hook-signature": sign(body) },
    body: JSON.parse(body),
    ...(rawBody === undefined ? {} : { rawBody }),
  };
}

type Resource = typeof newComment;
const state = (events: string[], secret = SECRET) => ({
  webhookId: "555",
  secret,
  resourceId: "42",
  events,
});
const ingest = (t: Resource, raw: ReturnType<typeof call>, st: unknown) =>
  t.handleIngest!(
    { raw, params: {}, state: st as never, subscriptionId: "sub_1" },
    mockCtx().ctx,
  );

const subscribe = async (t: Resource, params: Record<string, string>) => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { data: { gid: "555", resource_type: "webhook" }, "X-Hook-Secret": SECRET },
  }]);
  const got = await t.onSubscribe!(
    { params, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
    ctx,
  );
  return { got, calls };
};

// ---- the five fixed resource triggers ------------------------------------------------------------

const FIXED: Array<
  [Resource, string, Record<string, string>, string, string, string | undefined, unknown]
> = [
  [
    newComment,
    "new-comment",
    { projectId: "42" },
    "story",
    "added",
    "comment_added",
    [{ resource_type: "story", resource_subtype: "comment_added", action: "added" }],
  ],
  [
    newProject,
    "new-project",
    { workspaceId: "42" },
    "project",
    "added",
    undefined,
    [{ resource_type: "project", action: "added" }],
  ],
  [
    projectUpdated,
    "project-updated",
    { workspaceId: "42" },
    "project",
    "changed",
    undefined,
    [{ resource_type: "project", action: "changed" }],
  ],
  [
    projectDeleted,
    "project-deleted",
    { workspaceId: "42" },
    "project",
    "deleted",
    undefined,
    [{ resource_type: "project", action: "deleted" }],
  ],
];

for (const [trigger, key, params, rtype, action, subtype, filters] of FIXED) {
  const body = bodyFor(rtype, action, subtype);
  const st = state([`${rtype}.${action}`]);

  test(`${key}: declares its key, output and sample, and the fixture is non-canonical`, () => {
    assertEquals(trigger.key, key);
    assertEquals((trigger.output ?? []).length > 0, true);
    assertEquals((trigger.sample as { event: string }).event, `${rtype}.${action}`);
    assertEquals(JSON.stringify(JSON.parse(body)) !== body, true);
  });

  test(`${key}: a valid X-Hook-Signature over the raw body emits the event`, async () => {
    const out = evs(await ingest(trigger, call(body, {}), st)) as Array<Record<string, unknown>>;
    assertEquals(out, [{
      event: `${rtype}.${action}`,
      resourceId: "100",
      resourceType: rtype,
      resourceSubtype: subtype ?? null,
      action,
      createdAt: "2026-11-10T10:00:00.000Z",
      userId: "7",
      parentId: "42",
      parentType: "project",
      field: null,
      change: null,
    }]);
  });

  test(`${key}: a flipped byte, a re-serialised body or another secret is refused`, async () => {
    const flipped = body.replace('"gid": "100"', '"gid": "101"');
    assertEquals(flipped !== body, true);
    await assertRejects(
      () => ingest(trigger, call(body, { rawBody: flipped }), st),
      Error,
      "signature does not match",
    );
    await assertRejects(
      () =>
        ingest(
          trigger,
          call(body, { headers: { "x-hook-signature": sign(JSON.stringify(JSON.parse(body))) } }),
          st,
        ),
      Error,
      "signature does not match",
    );
    await assertRejects(
      () =>
        ingest(trigger, call(body, { headers: { "x-hook-signature": sign(body, "other") } }), st),
      Error,
      "signature does not match",
    );
  });

  test(`${key}: a missing header or an absent rawBody is refused`, async () => {
    await assertRejects(
      () => ingest(trigger, call(body, { headers: {} }), st),
      Error,
      "X-Hook-Signature is missing",
    );
    await assertRejects(
      () => ingest(trigger, call(body, { rawBody: null }), st),
      Error,
      "raw body",
    );
  });

  test(`${key}: an empty stored secret refuses the delivery before any compare`, async () => {
    // `{}`/null = no secret yet: only the handshake is answered, so a signed body is refused.
    for (const bad of [{}, null]) {
      await assertRejects(() => ingest(trigger, call(body, {}), bad), Error, "no signing secret");
    }
    await assertRejects(
      () => ingest(trigger, call(body, {}), state([`${rtype}.${action}`], "")),
      Error,
      "no signing secret",
    );
    await assertRejects(
      () => ingest(trigger, call(body, {}), { ...st, secret: 123 }),
      Error,
      "secret",
    );
  });

  test(`${key}: other events and heartbeats are acknowledged and dropped`, async () => {
    const other = bodyFor(rtype === "story" ? "story" : "project", "removed", subtype);
    assertEquals(evs(await ingest(trigger, call(other, {}), st)), []);
    const task = bodyFor("task", action);
    assertEquals(evs(await ingest(trigger, call(task, {}), st)), []);
    const beat = `{ "events": [ ] }`;
    assertEquals(evs(await ingest(trigger, call(beat, {}), st)), []);
  });

  test(`${key}: onSubscribe registers exactly its filters on the watched resource`, async () => {
    const { got, calls } = await subscribe(trigger, params);
    assertEquals(calls[0].method, "POST");
    assertEquals(calls[0].url, "https://app.asana.com/api/1.0/webhooks");
    assertEquals(JSON.parse(calls[0].body!), {
      data: { resource: "42", target: CALLBACK, filters },
    });
    assertEquals(got, {
      webhookId: "555",
      secret: SECRET,
      resourceId: "42",
      events: [`${rtype}.${action}`],
    });
  });
}

test("new-comment: a story that is not a comment is dropped", async () => {
  const b = bodyFor("story", "added", "assigned");
  assertEquals(evs(await ingest(newComment, call(b, {}), state(["story.added"]))), []);
});

test("new-comment: delivers a comment on a subtask too, with its task as the parent", async () => {
  const b = bodyFor("story", "added", "comment_added", "task");
  const out = evs(await ingest(newComment, call(b, {}), state(["story.added"]))) as Array<
    Record<string, unknown>
  >;
  assertEquals([out[0].parentType, out[0].parentId, out[0].resourceId], ["task", "42", "100"]);
});

test("project triggers refuse a missing workspace id before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      newProject.onSubscribe!(
        { params: { workspaceId: " " }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
        ctx,
      ),
    Error,
    "Workspace ID",
  );
  assertEquals(calls.length, 0);
});

test("the handshake is echoed for every resource trigger while no secret is stored", async () => {
  for (const t of [newComment, newProject, projectUpdated, projectDeleted, anyEvent]) {
    const out = await ingest(
      t,
      call("{}", { headers: { "x-hook-secret": "handshake0123456789abcdef" } }),
      {},
    );
    assertEquals(
      (out as { response?: { headers?: Record<string, string> } }).response?.headers,
      { "x-hook-secret": "handshake0123456789abcdef" },
    );
    assertEquals(evs(out), []);
  }
});

// ---- task-deleted (task builder, action deleted) -------------------------------------------------

test("task-deleted: signed delivery of a deleted task emits one event; other actions are dropped", async () => {
  const body = bodyFor("task", "deleted");
  const st = { webhookId: "555", secret: SECRET, projectId: "42", action: "deleted" };
  const call1 = call(body, {});
  const out = await taskDeleted.handleIngest!(
    { raw: call1, params: { projectId: "42" }, state: st as never, subscriptionId: "s" },
    mockCtx().ctx,
  );
  assertEquals(evs(out), [{
    taskId: "100",
    action: "deleted",
    createdAt: "2026-11-10T10:00:00.000Z",
    userId: "7",
    parentId: "42",
    field: null,
    change: null,
    resourceSubtype: null,
  }]);
  const added = bodyFor("task", "added");
  const dropped = await taskDeleted.handleIngest!(
    { raw: call(added, {}), params: {}, state: st as never, subscriptionId: "s" },
    mockCtx().ctx,
  );
  assertEquals(evs(dropped), []);
});

test("task-deleted: tampered, unsigned, bodiless and secret-less deliveries are refused", async () => {
  const body = bodyFor("task", "deleted");
  const st = { webhookId: "555", secret: SECRET, projectId: "42", action: "deleted" };
  const run = (raw: ReturnType<typeof call>, s: unknown = st) =>
    taskDeleted.handleIngest!(
      { raw, params: {}, state: s as never, subscriptionId: "s" },
      mockCtx().ctx,
    );
  await assertRejects(
    () => run(call(body, { rawBody: body.replace("100", "101") })),
    Error,
    "signature does not match",
  );
  await assertRejects(() => run(call(body, { headers: {} })), Error, "X-Hook-Signature is missing");
  await assertRejects(() => run(call(body, { rawBody: null })), Error, "raw body");
  await assertRejects(() => run(call(body, {}), { ...st, secret: "" }), Error, "no signing secret");
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { data: { gid: "555" }, "X-Hook-Secret": SECRET },
  }]);
  const got = await taskDeleted.onSubscribe!(
    { params: { projectId: "42" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      resource: "42",
      target: CALLBACK,
      filters: [{ resource_type: "task", action: "deleted" }],
    },
  });
  assertEquals((got as { action: string }).action, "deleted");
});

// ---- Any event ---------------------------------------------------------------------------------

test("any-event: a blank list registers no filter; the listed set registers exactly those", async () => {
  const blank = await subscribe(anyEvent, { resourceId: "42", events: " " });
  assertEquals(JSON.parse(blank.calls[0].body!), { data: { resource: "42", target: CALLBACK } });
  assertEquals((blank.got as { events: string[] }).events, []);

  const some = await subscribe(anyEvent, {
    resourceId: "9",
    events: " section.added, story.changed ,section.added",
  });
  assertEquals(JSON.parse(some.calls[0].body!), {
    data: {
      resource: "9",
      target: CALLBACK,
      filters: [
        { resource_type: "section", action: "added" },
        { resource_type: "story", action: "changed" },
      ],
    },
  });
  assertEquals((some.got as { events: string[] }).events, ["section.added", "story.changed"]);
});

test("any-event: a malformed event name or a missing resource is refused before any request", async () => {
  const { ctx, calls } = mockCtx();
  for (
    const params of [{ resourceId: "42", events: "task.added,tasks" }, { events: "task.added" }]
  ) {
    await assertRejects(() =>
      anyEvent.onSubscribe!(
        { params, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
        ctx,
      )
    );
  }
  assertEquals(calls.length, 0);
});

test("any-event: the events filter is applied to deliveries", async () => {
  const st = state(["section.added"]);
  const hit = evs(await ingest(anyEvent, call(bodyFor("section", "added"), {}), st)) as Array<
    Record<string, unknown>
  >;
  assertEquals(hit.length, 1);
  assertEquals([hit[0].event, hit[0].resourceType], ["section.added", "section"]);
  assertEquals(evs(await ingest(anyEvent, call(bodyFor("task", "added"), {}), st)), []);
});

test("any-event: a blank state delivers every event of every resource type", async () => {
  const b = `{ "events": [
    { "action": "added", "resource": {"gid": "1", "resource_type": "task"} },
    { "action": "changed", "resource": {"gid": "2", "resource_type": "story"}, "change": {"field": "text"} },
    { "action": "added", "resource": {"gid": "3"} } ] }`;
  const out = evs(await ingest(anyEvent, call(b, {}), state([]))) as Array<Record<string, unknown>>;
  assertEquals(out.map((e) => e.event), ["task.added", "story.changed"]);
  assertEquals(out[1].field, "text");
});

test("any-event: refuses an unsigned, tampered, bodiless or secret-less delivery", async () => {
  const b = bodyFor("task", "added");
  const st = state([]);
  await assertRejects(
    () => ingest(anyEvent, call(b, { headers: {} }), st),
    Error,
    "X-Hook-Signature",
  );
  await assertRejects(
    () => ingest(anyEvent, call(b, { rawBody: b.replace("100", "101") }), st),
    Error,
    "signature does not match",
  );
  await assertRejects(() => ingest(anyEvent, call(b, { rawBody: null }), st), Error, "raw body");
  await assertRejects(
    () => ingest(anyEvent, call(b, {}), state([], "")),
    Error,
    "no signing secret",
  );
});
