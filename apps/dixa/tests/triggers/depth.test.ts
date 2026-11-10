import { test } from "node:test";
import nodeAssert from "node:assert/strict";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import newQueue from "../../triggers/new-queue.ts";
import newTag from "../../triggers/new-tag.ts";
import newConversationMessage from "../../triggers/new-conversation-message.ts";
import newConversationNote from "../../triggers/new-conversation-note.ts";
import newConversationTag from "../../triggers/new-conversation-tag.ts";
import newEndUserConversation from "../../triggers/new-end-user-conversation.ts";

// deno-lint-ignore no-explicit-any
type Trigger = any;
const seeded = (s: { nextState: unknown }) => (s.nextState as { seeded?: boolean }).seeded;

interface Case {
  name: string;
  trigger: Trigger;
  params: Record<string, unknown>;
  /** The literal request the first (seeding) check sends. */
  path: string;
  query: Record<string, string>;
}

const cases: Case[] = [
  { name: "new-queue", trigger: newQueue, params: {}, path: "/v1/queues", query: {} },
  { name: "new-tag", trigger: newTag, params: {}, path: "/v1/tags", query: {} },
  {
    name: "new-conversation-message",
    trigger: newConversationMessage,
    params: { conversationId: 4217 },
    path: "/v1/conversations/4217/messages",
    query: {},
  },
  {
    name: "new-conversation-note",
    trigger: newConversationNote,
    params: { conversationId: 4217 },
    path: "/v1/conversations/4217/notes",
    query: {},
  },
  {
    name: "new-conversation-tag",
    trigger: newConversationTag,
    params: { conversationId: 4217 },
    path: "/v1/conversations/4217/tags",
    query: {},
  },
  {
    name: "new-end-user-conversation",
    trigger: newEndUserConversation,
    params: { userId: "user-1" },
    path: "/v1/endusers/user-1/conversations",
    query: { pageLimit: "100" },
  },
];

for (const c of cases) {
  const row = (id: string) => ({ id, name: `row ${id}` });
  const respond = (...ids: string[]) => mockCtx([{ status: 200, body: { data: ids.map(row) } }]);
  const input = { params: c.params, subscriptionId: "sub-1" };

  test(`${c.name}: seeds without flooding and sends the documented request`, async () => {
    const seed = respond("a", "b");
    const result = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(result.events, []);
    assertEquals(seeded(result), true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(pathOf(seed.calls[0].url), c.path);
    assertEquals(queryOf(seed.calls[0].url), c.query);
  });

  test(`${c.name}: emits only the new row and retries idempotently`, async () => {
    const seed = await c.trigger.poll!({ ...input, state: {} }, respond("a", "b").ctx);
    const first = await c.trigger.poll!(
      { ...input, state: seed.nextState },
      respond("c", "b", "a").ctx,
    );
    const retry = await c.trigger.poll!(
      { ...input, state: seed.nextState },
      respond("c", "b", "a").ctx,
    );
    assertEquals(first.events, [row("c")]);
    assertEquals(retry, first);
  });
}

test("new-end-user-conversation: follows the pageKey cursor to the last page", async () => {
  const page = (id: number, next?: string) => ({
    status: 200,
    body: {
      data: [{ id }],
      ...(next ? { meta: { next: `/v1/endusers/user-1/conversations?pageKey=${next}` } } : {}),
    },
  });
  const run = mockCtx([page(1, "k2"), page(2)]);
  const out = await newEndUserConversation.poll!(
    { params: { userId: "user-1" }, subscriptionId: "sub-1", state: {} },
    run.ctx,
  );
  assertEquals(out.events, []);
  assertEquals(run.calls.map((call) => queryOf(call.url)), [
    { pageLimit: "100" },
    { pageLimit: "100", pageKey: "k2" },
  ]);
});

test("new-end-user-conversation: refuses to compare a list longer than 20 pages", async () => {
  const forever = Array.from({ length: 20 }, (_, i) => ({
    status: 200,
    body: {
      data: [{ id: i }],
      meta: { next: `/v1/endusers/user-1/conversations?pageKey=k${i}` },
    },
  }));
  await nodeAssert.rejects(async () =>
    await newEndUserConversation.poll!(
      { params: { userId: "user-1" }, subscriptionId: "sub-1", state: {} },
      mockCtx(forever).ctx,
    ), /exceeds 20 pages/);
});

test("new-conversation-message: a bad conversation id is refused before any request", async () => {
  const run = mockCtx();
  await nodeAssert.rejects(async () =>
    await newConversationMessage.poll!(
      { params: { conversationId: "abc" }, subscriptionId: "sub-1", state: {} },
      run.ctx,
    ), /positive integer/);
  assertEquals(run.calls.length, 0);
});
