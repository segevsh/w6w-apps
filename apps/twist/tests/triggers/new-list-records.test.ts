import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newChannel from "../../triggers/new-channel.ts";
import newComment from "../../triggers/new-comment.ts";
import newConversation from "../../triggers/new-conversation.ts";
import newGroup from "../../triggers/new-group.ts";
import newThread from "../../triggers/new-thread.ts";
import newWorkspace from "../../triggers/new-workspace.ts";
import newWorkspaceUser from "../../triggers/new-workspace-user.ts";

const cases = [
  {
    key: "new-channel",
    trigger: newChannel,
    params: { workspaceId: 5 },
    url: "https://api.twist.com/api/v3/channels/get?workspace_id=5",
  },
  {
    key: "new-comment",
    trigger: newComment,
    params: { threadId: 5 },
    url: "https://api.twist.com/api/v3/comments/get?thread_id=5&limit=100&order_by=desc",
  },
  {
    key: "new-conversation",
    trigger: newConversation,
    params: { workspaceId: 5 },
    url: "https://api.twist.com/api/v3/conversations/get?workspace_id=5&limit=100&order_by=desc",
  },
  {
    key: "new-group",
    trigger: newGroup,
    params: { workspaceId: 5 },
    url: "https://api.twist.com/api/v3/groups/get?workspace_id=5",
  },
  {
    key: "new-thread",
    trigger: newThread,
    params: { channelId: 5 },
    url: "https://api.twist.com/api/v3/threads/get?channel_id=5&limit=100&order_by=desc",
  },
  {
    key: "new-workspace",
    trigger: newWorkspace,
    params: {},
    url: "https://api.twist.com/api/v3/workspaces/get",
  },
  {
    key: "new-workspace-user",
    trigger: newWorkspaceUser,
    params: { workspaceId: 5 },
    url: "https://api.twist.com/api/v4/workspace_users/get?id=5",
  },
];

for (const c of cases) {
  test(`${c.key}: seeds, emits, retries, and uses the wrapped list request`, async () => {
    const input = { params: c.params, subscriptionId: "sub-1" };
    const seed = mockCtx([{ body: [{ id: 1 }] }]);
    const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);

    const page = [{ id: 2 }, { id: 1 }];
    const first = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page }]).ctx,
    );
    const retry = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page }]).ctx,
    );
    assertEquals(first.events, [{ id: 2 }]);
    assertEquals(retry, first);
  });
}
