import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import taskStatusUpdated from "../../triggers/task-status-updated.ts";
import taskPriorityUpdated from "../../triggers/task-priority-updated.ts";
import taskAssigneeUpdated from "../../triggers/task-assignee-updated.ts";
import taskDueDateUpdated from "../../triggers/task-due-date-updated.ts";
import taskTagUpdated from "../../triggers/task-tag-updated.ts";
import taskMoved from "../../triggers/task-moved.ts";
import taskCommentUpdated from "../../triggers/task-comment-updated.ts";
import taskTimeEstimateUpdated from "../../triggers/task-time-estimate-updated.ts";
import taskTimeTrackedUpdated from "../../triggers/task-time-tracked-updated.ts";
import listCreated from "../../triggers/list-created.ts";
import listUpdated from "../../triggers/list-updated.ts";
import listDeleted from "../../triggers/list-deleted.ts";
import folderCreated from "../../triggers/folder-created.ts";
import folderUpdated from "../../triggers/folder-updated.ts";
import folderDeleted from "../../triggers/folder-deleted.ts";
import anyEvent from "../../triggers/any-event.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

const SECRET = "test-secret";
const WEBHOOK_ID = "4b67ac88-e506-4a29-9d42-26e504e3435e";
const CALLBACK = "https://w6w.example/triggers/webhooks/sub_1";
const sign = (body: string, key = SECRET) => createHmac("sha256", key).update(body).digest("hex");

/** A delivery body with non-canonical whitespace: JSON.stringify(JSON.parse(b)) !== b. */
function bodyFor(event: string, ids: string): string {
  return `{ "event": "${event}",
  "history_items": [ { "id": "2800763136717140857", "field": "x" } ],
  ${ids},
  "webhook_id": "${WEBHOOK_ID}" }`;
}

function call(body: string, over: { headers?: Record<string, string>; rawBody?: string | null }) {
  const rawBody = over.rawBody === null ? undefined : over.rawBody ?? body;
  return {
    method: "POST",
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers: over.headers ?? { "x-signature": sign(body) },
    body: JSON.parse(body),
    ...(rawBody === undefined ? {} : { rawBody }),
  };
}

type Trig = typeof taskStatusUpdated;
const state = (events: string[], secret = SECRET) => ({
  webhookId: WEBHOOK_ID,
  secret,
  teamId: "123",
  events,
});
const ingest = (t: Trig, raw: ReturnType<typeof call>, st: unknown) =>
  t.handleIngest!(
    { raw, params: { teamId: "123" }, state: st as never, subscriptionId: "sub_1" },
    mockCtx().ctx,
  );

const TASK_IDS = `"task_id": "c0j", "list_id": "162641062"`;
const LIST_IDS = `"list_id": "162641285"`;
const FOLDER_IDS = `"folder_id": "96772212"`;
const NAMED: Array<[Trig, string, string, string]> = [
  [taskStatusUpdated, "task-status-updated", "taskStatusUpdated", TASK_IDS],
  [taskPriorityUpdated, "task-priority-updated", "taskPriorityUpdated", TASK_IDS],
  [taskAssigneeUpdated, "task-assignee-updated", "taskAssigneeUpdated", TASK_IDS],
  [taskDueDateUpdated, "task-due-date-updated", "taskDueDateUpdated", TASK_IDS],
  [taskTagUpdated, "task-tag-updated", "taskTagUpdated", TASK_IDS],
  [taskMoved, "task-moved", "taskMoved", TASK_IDS],
  [taskCommentUpdated, "task-comment-updated", "taskCommentUpdated", TASK_IDS],
  [taskTimeEstimateUpdated, "task-time-estimate-updated", "taskTimeEstimateUpdated", TASK_IDS],
  [taskTimeTrackedUpdated, "task-time-tracked-updated", "taskTimeTrackedUpdated", TASK_IDS],
  [listCreated, "list-created", "listCreated", LIST_IDS],
  [listUpdated, "list-updated", "listUpdated", LIST_IDS],
  [listDeleted, "list-deleted", "listDeleted", LIST_IDS],
  [folderCreated, "folder-created", "folderCreated", FOLDER_IDS],
  [folderUpdated, "folder-updated", "folderUpdated", FOLDER_IDS],
  [folderDeleted, "folder-deleted", "folderDeleted", FOLDER_IDS],
];

for (const [trigger, key, event, ids] of NAMED) {
  const body = bodyFor(event, ids);
  const st = state([event]);

  test(`${key}: declares its key, a non-empty output and a sample of its own event`, () => {
    assertEquals(trigger.key, key);
    assertEquals((trigger.output ?? []).length > 0, true);
    assertEquals((trigger.sample as { event: string }).event, event);
    assertEquals(JSON.stringify(JSON.parse(body)) !== body, true);
  });

  test(`${key}: a valid X-Signature over the raw body emits one event`, async () => {
    const out = evs(await ingest(trigger, call(body, {}), st)) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].event, event);
    assertEquals(out[0].webhookId, WEBHOOK_ID);
    assertEquals(out[0].idempotencyKey, `${WEBHOOK_ID}:2800763136717140857`);
  });

  test(`${key}: one flipped byte, a re-serialised body or another secret is refused`, async () => {
    const flipped = body.replace('"id": "2800763136717140857"', '"id": "2800763136717140858"');
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
          call(body, { headers: { "x-signature": sign(JSON.stringify(JSON.parse(body))) } }),
          st,
        ),
      Error,
      "signature does not match",
    );
    await assertRejects(
      () => ingest(trigger, call(body, { headers: { "x-signature": sign(body, "other") } }), st),
      Error,
      "signature does not match",
    );
  });

  test(`${key}: a missing header or an absent rawBody is refused`, async () => {
    await assertRejects(
      () => ingest(trigger, call(body, { headers: {} }), st),
      Error,
      "X-Signature is missing",
    );
    await assertRejects(
      () => ingest(trigger, call(body, { rawBody: null }), st),
      Error,
      "raw body",
    );
  });

  test(`${key}: an unset or empty stored secret refuses the delivery before any compare`, async () => {
    for (const bad of [{}, null, state([event], "")]) {
      await assertRejects(() => ingest(trigger, call(body, { headers: {} }), bad), Error, "secret");
    }
  });

  test(`${key}: another event is acknowledged and dropped`, async () => {
    const other = bodyFor("taskDeleted", ids);
    const out = await ingest(trigger, call(other, {}), st);
    assertEquals(evs(out), []);
  });

  test(`${key}: onSubscribe registers exactly its event`, async () => {
    const { ctx, calls } = mockCtx([{ body: { id: "w", webhook: { id: "w", secret: SECRET } } }]);
    const got = await trigger.onSubscribe!(
      {
        params: { teamId: "123", spaceId: "99" },
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "h",
      },
      ctx,
    );
    assertEquals(calls[0].method, "POST");
    assertEquals(calls[0].url, "https://api.clickup.com/api/v2/team/123/webhook");
    assertEquals(JSON.parse(calls[0].body!), {
      endpoint: CALLBACK,
      events: [event],
      space_id: 99,
    });
    assertEquals(got, { webhookId: "w", secret: SECRET, teamId: "123", events: [event] });
  });
}

test("list and folder events carry the location id they concern", async () => {
  const l = evs(
    await ingest(listCreated, call(bodyFor("listCreated", LIST_IDS), {}), state(["listCreated"])),
  ) as Array<Record<string, unknown>>;
  assertEquals([l[0].listId, l[0].taskId, l[0].folderId], ["162641285", null, null]);
  const f = evs(
    await ingest(
      folderUpdated,
      call(bodyFor("folderUpdated", FOLDER_IDS), {}),
      state(["folderUpdated"]),
    ),
  ) as Array<Record<string, unknown>>;
  assertEquals([f[0].folderId, f[0].taskId, f[0].listId], ["96772212", null, null]);
});

// ---- Any event ---------------------------------------------------------------------------------

const subscribeAny = async (events: string | undefined) => {
  const { ctx, calls } = mockCtx([{ body: { id: "w", webhook: { id: "w", secret: SECRET } } }]);
  const got = await anyEvent.onSubscribe!(
    {
      params: { teamId: "123", ...(events === undefined ? {} : { events }) },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "h",
    },
    ctx,
  );
  return { got, calls };
};

test("any-event: a blank events list registers the ClickUp wildcard", async () => {
  for (const events of [undefined, "", "  ,  "]) {
    const { got, calls } = await subscribeAny(events);
    assertEquals(JSON.parse(calls[0].body!), { endpoint: CALLBACK, events: ["*"] });
    assertEquals((got as { events: string[] }).events, ["*"]);
  }
});

test("any-event: a listed set registers exactly those events, trimmed and de-duplicated", async () => {
  const { got, calls } = await subscribeAny(" spaceCreated, goalUpdated ,spaceCreated");
  assertEquals(JSON.parse(calls[0].body!).events, ["spaceCreated", "goalUpdated"]);
  assertEquals((got as { events: string[] }).events, ["spaceCreated", "goalUpdated"]);
});

test("any-event: an unknown event name is refused before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      anyEvent.onSubscribe!(
        {
          params: { teamId: "123", events: "taskCreated,taskCreatd" },
          subscriptionId: "s",
          callbackUrl: CALLBACK,
          hostUrl: "h",
        },
        ctx,
      ),
    Error,
    "taskCreatd",
  );
  assertEquals(calls.length, 0);
});

test("any-event: the events filter is applied to deliveries (listed set)", async () => {
  const st = state(["spaceCreated", "goalUpdated"]);
  const goal = bodyFor("goalUpdated", `"goal_id": "a23e5a3d-74b5-44c2-ab53-917ebe85045a"`);
  const hit = evs(await ingest(anyEvent, call(goal, {}), st)) as Array<Record<string, unknown>>;
  assertEquals(hit.length, 1);
  assertEquals(hit[0].event, "goalUpdated");
  assertEquals(hit[0].goalId, "a23e5a3d-74b5-44c2-ab53-917ebe85045a");
  const miss = bodyFor("taskCreated", TASK_IDS);
  assertEquals(evs(await ingest(anyEvent, call(miss, {}), st)), []);
});

test("any-event: the wildcard state accepts every event, including key results", async () => {
  const st = state(["*"]);
  const kr = bodyFor(
    "keyResultCreated",
    `"goal_id": "a23e5a3d-74b5-44c2-ab53-917ebe85045a", "key_result_id": "47608e42-ad0e-4934-a39e-950539c77e79"`,
  );
  const out = evs(await ingest(anyEvent, call(kr, {}), st)) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].keyResultId, "47608e42-ad0e-4934-a39e-950539c77e79");
  const sp = bodyFor("spaceDeleted", `"space_id": "54650507"`);
  const sps = evs(await ingest(anyEvent, call(sp, {}), st)) as Array<Record<string, unknown>>;
  assertEquals([sps[0].event, sps[0].spaceId], ["spaceDeleted", "54650507"]);
});

test("any-event: refuses an unsigned, tampered, bodiless or secret-less delivery", async () => {
  const st = state(["*"]);
  const b = bodyFor("taskCreated", TASK_IDS);
  await assertRejects(() => ingest(anyEvent, call(b, { headers: {} }), st), Error, "X-Signature");
  await assertRejects(
    () => ingest(anyEvent, call(b, { rawBody: b.replace("c0j", "c0k") }), st),
    Error,
    "signature does not match",
  );
  await assertRejects(() => ingest(anyEvent, call(b, { rawBody: null }), st), Error, "raw body");
  await assertRejects(
    () => ingest(anyEvent, call(b, { headers: {} }), state(["*"], "")),
    Error,
    "secret",
  );
});
