import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import itemCreated from "../../triggers/item-created.ts";
import columnChanged from "../../triggers/column-value-changed.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

const CREATED = `{ "event" : { "userId": 9603417,  "boardId": 1771812698, "pulseId": 1772099344,
  "pulseName": "Launch checklist", "groupId": "topics", "columnValues": {}, "app": "monday",
  "type": "create_pulse", "triggerTime": "2026-11-10T09:07:28.210Z", "subscriptionId": 73759690,
  "triggerUuid": "b5ed" } }`;
const CHANGED = `{ "event": { "userId": 9603417, "boardId": 1771812698, "pulseId": 1771812728,
  "columnId": "date4", "columnType": "date", "columnTitle": "Date",
  "value": { "date": "2026-11-10" }, "previousValue": null, "type": "update_column_value",
  "triggerTime": "2026-11-10T09:15:03.429Z", "subscriptionId": 73760484 } }`;

const call = (b: string, over: Record<string, unknown> = {}) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: {},
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params: { boardId: "1771812698" },
  state: { boardId: "1771812698", webhookId: "555" },
  subscriptionId: "sub_1",
});
const ingest = (t: typeof itemCreated, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

test("app declares both webhook triggers with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), ["item-created", "column-value-changed"]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
  }
});

test("a create_pulse delivery → one normalized item-created event", async () => {
  const out = evs(await ingest(itemCreated, call(CREATED))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].itemId, "1772099344");
  assertEquals(out[0].itemName, "Launch checklist");
  assertEquals(out[0].boardId, "1771812698");
  assertEquals(out[0].groupId, "topics");
});

test("an update_column_value delivery → one column-value-changed event", async () => {
  const out = evs(await ingest(columnChanged, call(CHANGED))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].columnId, "date4");
  assertEquals(out[0].value, { date: "2026-11-10" });
});

test("a delivery of another event type is acknowledged with no event", async () => {
  assertEquals(evs(await ingest(itemCreated, call(CHANGED))), []);
  assertEquals(evs(await ingest(columnChanged, call(CREATED))), []);
});

test("the URL-verification challenge is echoed, starts no run", async () => {
  const b = `{"challenge":"3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P"}`;
  const result = await ingest(itemCreated, call(b));
  assertEquals(evs(result), []);
  const response =
    (result as { response?: { status?: number; headers?: Record<string, string>; body?: string } })
      .response!;
  assertEquals(response.status, 200);
  assertEquals(response.headers, { "content-type": "application/json" });
  assertEquals(JSON.parse(response.body!), {
    challenge: "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P",
  });
});

test("a challenge that is not a short string is not echoed", async () => {
  for (const b of [`{"challenge": {"a":1}}`, `{"challenge": "${"x".repeat(600)}"}`]) {
    await assertRejects(() => ingest(itemCreated, call(b)), Error);
  }
});

test("a body without an event is refused; a non-POST call is refused", async () => {
  await assertRejects(() => ingest(itemCreated, call(`{"hello":1}`)), Error, "event");
  await assertRejects(() => ingest(itemCreated, call(CREATED, { method: "GET" })), Error, "POST");
});

test("onSubscribe sends the literal create_webhook mutation and keeps the webhook id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { create_webhook: { id: "555", board_id: "1" } } },
  }]);
  const state = await itemCreated.onSubscribe!(
    {
      params: { boardId: " 1771812698 " },
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    ctx,
  );
  assertEquals(state, { boardId: "1771812698", webhookId: "555" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.monday.com/v2");
  const sent = JSON.parse(calls[0].body!);
  assert(sent.query.includes("create_webhook(board_id: $boardId, url: $url, event: $event)"));
  assertEquals(sent.variables, { boardId: "1771812698", url: CALLBACK, event: "create_item" });
});

test("column-value-changed subscribes to change_column_value", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { create_webhook: { id: 9 } } } }]);
  const state = await columnChanged.onSubscribe!(
    { params: { boardId: "1" }, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { boardId: "1", webhookId: "9" });
  assertEquals(JSON.parse(calls[0].body!).variables.event, "change_column_value");
});

test("onSubscribe refuses an empty board id and a missing webhook id", async () => {
  await assertRejects(
    () =>
      itemCreated.onSubscribe!(
        { params: { boardId: " " }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        mockCtx().ctx,
      ),
    Error,
    "board",
  );
  await assertRejects(
    () =>
      itemCreated.onSubscribe!(
        { params: { boardId: "1" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        mockCtx([{ body: { data: { create_webhook: null } } }]).ctx,
      ),
    Error,
    "webhook id",
  );
});

test("onUnsubscribe sends the literal delete_webhook mutation", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { delete_webhook: { id: "555" } } } }]);
  await itemCreated.onUnsubscribe!(
    { params: { boardId: "1" }, state: { boardId: "1", webhookId: "555" }, subscriptionId: "s" },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query, "mutation ($id: ID!) { delete_webhook(id: $id) { id } }");
  assertEquals(sent.variables, { id: "555" });
});

test("onUnsubscribe: a webhook monday no longer has is gone; other errors surface", async () => {
  const state = { boardId: "1", webhookId: "555" };
  const gone = mockCtx([{ body: { errors: [{ message: "Webhook not found" }] } }]);
  await itemCreated.onUnsubscribe!(
    { params: { boardId: "1" }, state, subscriptionId: "s" },
    gone.ctx,
  );
  const bad = mockCtx([{ body: { errors: [{ message: "User unauthorized to perform action" }] } }]);
  await assertRejects(
    () =>
      itemCreated.onUnsubscribe!({ params: { boardId: "1" }, state, subscriptionId: "s" }, bad.ctx),
    Error,
    "unauthorized",
  );
  const none = mockCtx();
  await itemCreated.onUnsubscribe!(
    { params: { boardId: "1" }, state: {}, subscriptionId: "s" },
    none.ctx,
  );
  assertEquals(none.calls.length, 0);
});
