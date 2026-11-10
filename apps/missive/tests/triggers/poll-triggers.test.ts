import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newComment from "../../triggers/new-comment.ts";
import newContactGroup from "../../triggers/new-contact-group.ts";
import newConversation from "../../triggers/new-conversation.ts";
import newDraft from "../../triggers/new-draft.ts";
import newMessage from "../../triggers/new-message.ts";
import newOrUpdatedConversation from "../../triggers/new-or-updated-conversation.ts";
import newOrUpdatedTask from "../../triggers/new-or-updated-task.ts";
import newPost from "../../triggers/new-post.ts";
import newTask from "../../triggers/new-task.ts";

const cases = [
  {
    key: "new-comment",
    trigger: newComment,
    input: { conversationId: "conversation" },
    body: { comments: [{ id: "a", created_at: 1 }] },
    next: { comments: [{ id: "b", created_at: 2 }, { id: "a", created_at: 1 }] },
    url: "https://public.missiveapp.com/v1/conversations/conversation/comments?limit=10&until=0",
  },
  {
    key: "new-conversation",
    trigger: newConversation,
    input: { mailbox: "inbox" },
    body: { conversations: [{ id: "a", last_activity_at: 1 }] },
    next: { conversations: [{ id: "b", last_activity_at: 2 }, { id: "a", last_activity_at: 1 }] },
    url: "https://public.missiveapp.com/v1/conversations?inbox=true&limit=50&until=0",
  },
  {
    key: "new-draft",
    trigger: newDraft,
    input: { conversationId: "conversation" },
    body: { drafts: [{ id: "a", delivered_at: 1 }] },
    next: { drafts: [{ id: "b", delivered_at: 2 }, { id: "a", delivered_at: 1 }] },
    url: "https://public.missiveapp.com/v1/conversations/conversation/drafts?limit=10&until=0",
  },
  {
    key: "new-message",
    trigger: newMessage,
    input: { conversationId: "conversation" },
    body: { messages: [{ id: "a", delivered_at: 1 }] },
    next: { messages: [{ id: "b", delivered_at: 2 }, { id: "a", delivered_at: 1 }] },
    url: "https://public.missiveapp.com/v1/conversations/conversation/messages?limit=10&until=0",
  },
  {
    key: "new-or-updated-conversation",
    trigger: newOrUpdatedConversation,
    input: { mailbox: "inbox" },
    body: { conversations: [{ id: "a", last_activity_at: 1 }] },
    next: { conversations: [{ id: "b", last_activity_at: 2 }, { id: "a", last_activity_at: 1 }] },
    url: "https://public.missiveapp.com/v1/conversations?inbox=true&limit=50&until=0",
  },
  {
    key: "new-or-updated-task",
    trigger: newOrUpdatedTask,
    input: {},
    body: { tasks: [{ id: "a", last_activity_at: 1 }] },
    next: { tasks: [{ id: "b", last_activity_at: 2 }, { id: "a", last_activity_at: 1 }] },
    url: "https://public.missiveapp.com/v1/tasks?limit=50&until=0&type=all",
  },
  {
    key: "new-post",
    trigger: newPost,
    input: { conversationId: "conversation" },
    body: { posts: [{ id: "a", created_at: 1 }] },
    next: { posts: [{ id: "b", created_at: 2 }, { id: "a", created_at: 1 }] },
    url: "https://public.missiveapp.com/v1/conversations/conversation/posts?limit=10&until=0",
  },
  {
    key: "new-task",
    trigger: newTask,
    input: {},
    body: { tasks: [{ id: "a", last_activity_at: 1 }] },
    next: { tasks: [{ id: "b", last_activity_at: 2 }, { id: "a", last_activity_at: 1 }] },
    url: "https://public.missiveapp.com/v1/tasks?limit=50&until=0&type=all",
  },
];

for (const entry of cases) {
  test(`${entry.key} seeds, emits, retries, and makes its literal list request`, async () => {
    const input = { params: entry.input, state: {}, subscriptionId: "sub" };
    const seed = mockCtx([{ body: entry.body }]);
    const seeded = await entry.trigger.poll!(input, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, entry.url);

    const first = await entry.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: entry.next }]).ctx,
    );
    const retry = await entry.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: entry.next }]).ctx,
    );
    assertEquals(first.events, [(Object.values(entry.next)[0] as unknown[])[0]]);
    assertEquals(retry, first);
  });
}

test("new-contact-group snapshots a chosen contact book with literal GET pagination", async () => {
  const input = {
    params: { contactBook: "book", kind: "group" },
    state: {},
    subscriptionId: "sub",
  };
  const seed = mockCtx([{ body: { contact_groups: [{ id: "a", name: "First" }] } }]);
  const seeded = await newContactGroup.poll!(input, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://public.missiveapp.com/v1/contact_groups?contact_book=book&kind=group&limit=200&offset=0",
  );

  const changed = await newContactGroup.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{
      body: { contact_groups: [{ id: "a", name: "Renamed" }, { id: "b", name: "New" }] },
    }])
      .ctx,
  );
  assertEquals(changed.events, [
    { change: "updated", key: "a", values: { id: "a", name: "Renamed" } },
    { change: "added", key: "b", values: { id: "b", name: "New" } },
  ]);
});
