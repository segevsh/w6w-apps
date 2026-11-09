import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import taskCreated from "../../triggers/task-created.ts";
import taskUpdated from "../../triggers/task-updated.ts";
import taskDeleted from "../../triggers/task-deleted.ts";
import taskCommentPosted from "../../triggers/task-comment-posted.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

const SECRET = "O94IM25S7PXBPYTMNXLLET230SRP0S89COR7B1YOJ2ZIE8WQNK5UUKEF26W0Z5GA";
const WEBHOOK_ID = "4b67ac88-e506-4a29-9d42-26e504e3435e";
const STATE = { webhookId: WEBHOOK_ID, secret: SECRET, teamId: "123", events: ["taskCreated"] };
const CALLBACK = "https://w6w.example/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "event": "taskCreated",
  "history_items": [ { "id": "2800763136717140857", "field": "status", "parent_id": "162641062" } ],
  "task_id": "c0j", "list_id": "162641062",
  "webhook_id": "${WEBHOOK_ID}" }`;

const sign = (body: string, key = SECRET) => createHmac("sha256", key).update(body).digest("hex");

function call(
  over: { headers?: Record<string, string>; rawBody?: string | null; method?: string },
) {
  const rawBody = over.rawBody === null ? undefined : over.rawBody ?? BODY;
  return {
    method: over.method ?? "POST",
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers: over.headers ?? { "x-signature": sign(BODY) },
    body: JSON.parse(BODY),
    ...(rawBody === undefined ? {} : { rawBody }),
  };
}

function ingest(
  raw: ReturnType<typeof call>,
  state: unknown = STATE,
  trigger: typeof taskCreated = taskCreated,
) {
  return trigger.handleIngest!(
    { raw, params: { teamId: "123" }, state: state as never, subscriptionId: "sub_1" },
    mockCtx().ctx,
  );
}

test("fixture body is non-canonical JSON", () => {
  assertEquals(JSON.stringify(JSON.parse(BODY)) !== BODY, true);
});

test("valid X-Signature over the raw body emits one event", async () => {
  assertEquals(evs(await ingest(call({}))), [{
    event: "taskCreated",
    taskId: "c0j",
    listId: "162641062",
    folderId: null,
    spaceId: null,
    webhookId: WEBHOOK_ID,
    idempotencyKey: `${WEBHOOK_ID}:2800763136717140857`,
    historyItems: [{ id: "2800763136717140857", field: "status", parent_id: "162641062" }],
  }]);
});

test("an uppercase hex signature still verifies (hex is case-insensitive)", async () => {
  const out = evs(await ingest(call({ headers: { "x-signature": sign(BODY).toUpperCase() } })));
  assertEquals(out.length, 1);
});

test("a signature over the re-serialised body is refused", async () => {
  const reserialised = sign(JSON.stringify(JSON.parse(BODY)));
  await assertRejects(
    () => ingest(call({ headers: { "x-signature": reserialised } })),
    Error,
    "signature does not match",
  );
});

test("one flipped byte in the body is refused", async () => {
  const flipped = BODY.replace('"task_id": "c0j"', '"task_id": "c0k"');
  await assertRejects(() => ingest(call({ rawBody: flipped })), Error, "signature does not match");
});

test("a missing signature header is refused", async () => {
  await assertRejects(() => ingest(call({ headers: {} })), Error, "X-Signature is missing");
});

test("a signature made with another secret is refused", async () => {
  await assertRejects(
    () => ingest(call({ headers: { "x-signature": sign(BODY, "z".repeat(64)) } })),
    Error,
    "signature does not match",
  );
});

test("an absent rawBody is refused", async () => {
  await assertRejects(() => ingest(call({ rawBody: null })), Error, "raw body");
});

test("an unset or empty stored secret refuses the delivery", async () => {
  for (const state of [{}, null, { ...STATE, secret: "" }]) {
    await assertRejects(() => ingest(call({ headers: {} }), state), Error, "secret");
  }
});

test("refusals never echo the secret, the signature or a header value", async () => {
  const bad = "ab".repeat(32);
  const err = await assertRejects(() => ingest(call({ headers: { "x-signature": bad } })));
  assertEquals(err.message.includes(SECRET) || err.message.includes(bad), false);
});

test("a non-POST delivery is refused", async () => {
  await assertRejects(() => ingest(call({ method: "GET" })), Error, "POST");
});

test("a signed delivery for another webhook is refused", async () => {
  const other = BODY.replace(WEBHOOK_ID, "00000000-0000-0000-0000-000000000000");
  await assertRejects(
    () => ingest(call({ rawBody: other, headers: { "x-signature": sign(other) } })),
    Error,
    "another webhook",
  );
});

test("an event the trigger did not register for is acknowledged and dropped", async () => {
  const other = BODY.replace('"taskCreated"', '"taskDeleted"');
  const out = await ingest(call({ rawBody: other, headers: { "x-signature": sign(other) } }));
  assertEquals(evs(out), []);
});

test("onSubscribe creates a team webhook for the events and keeps the secret", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: WEBHOOK_ID, webhook: { id: WEBHOOK_ID, secret: SECRET, events: ["taskCreated"] } },
  }]);
  const state = await taskCreated.onSubscribe!(
    {
      params: { teamId: " 123 ", listId: "4567" },
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "https://w6w.example",
    },
    ctx,
  );
  assertEquals(state, {
    webhookId: WEBHOOK_ID,
    secret: SECRET,
    teamId: "123",
    events: ["taskCreated"],
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.clickup.com/api/v2/team/123/webhook");
  assertEquals(JSON.parse(calls[0].body!), {
    endpoint: CALLBACK,
    events: ["taskCreated"],
    list_id: 4567,
  });
});

test("task-updated, task-deleted and task-comment-posted register their event names", async () => {
  const expected: Array<[typeof taskUpdated, string[]]> = [
    [taskUpdated, [
      "taskUpdated",
      "taskStatusUpdated",
      "taskAssigneeUpdated",
      "taskDueDateUpdated",
      "taskPriorityUpdated",
      "taskMoved",
    ]],
    [taskDeleted, ["taskDeleted"]],
    [taskCommentPosted, ["taskCommentPosted"]],
  ];
  for (const [trigger, events] of expected) {
    const { ctx, calls } = mockCtx([{ body: { id: "w", webhook: { id: "w", secret: SECRET } } }]);
    await trigger.onSubscribe!(
      { params: { teamId: "123" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
      ctx,
    );
    assertEquals(JSON.parse(calls[0].body!).events, events);
  }
});

test("onSubscribe refuses a missing team id or a non-numeric location before any request", async () => {
  const { ctx, calls } = mockCtx();
  for (const params of [{}, { teamId: "abc" }, { teamId: "1", spaceId: "x" }]) {
    await assertRejects(() =>
      taskCreated.onSubscribe!(
        { params, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
        ctx,
      )
    );
  }
  assertEquals(calls.length, 0);
});

test("onSubscribe undoes the registration when ClickUp returns no secret", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "w1", webhook: { id: "w1" } } },
    { body: {} },
  ]);
  await assertRejects(
    () =>
      taskCreated.onSubscribe!(
        { params: { teamId: "123" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
        ctx,
      ),
    Error,
    "no secret",
  );
  assertEquals(calls.map((c) => `${c.method} ${new URL(c.url).pathname}`), [
    "POST /api/v2/team/123/webhook",
    "DELETE /api/v2/webhook/w1",
  ]);
});

test("onUnsubscribe deletes the webhook; 404 and 410 mean already gone", async () => {
  for (const status of [200, 404, 410]) {
    const { ctx, calls } = mockCtx([{ status, body: {} }]);
    await taskCreated.onUnsubscribe!(
      { params: {}, state: STATE as never, subscriptionId: "sub_1" },
      ctx,
    );
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, "DELETE");
    assertEquals(calls[0].url, `https://api.clickup.com/api/v2/webhook/${WEBHOOK_ID}`);
  }
  const { ctx } = mockCtx([{ status: 500, body: { err: "boom" } }]);
  await assertRejects(
    () =>
      taskCreated.onUnsubscribe!(
        { params: {}, state: STATE as never, subscriptionId: "sub_1" },
        ctx,
      ),
    Error,
    "ClickUp 500",
  );
});

test("onUnsubscribe with no stored webhook makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await taskCreated.onUnsubscribe!({ params: {}, state: {} as never, subscriptionId: "s" }, ctx);
  assertEquals(calls.length, 0);
});
