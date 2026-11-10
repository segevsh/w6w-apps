import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newChannel from "../../triggers/new-channel.ts";
import newConversation from "../../triggers/new-conversation.ts";
import newGroup from "../../triggers/new-group.ts";
import newOrUpdatedConversation from "../../triggers/new-or-updated-conversation.ts";
import newOrUpdatedInboxThread from "../../triggers/new-or-updated-inbox-thread.ts";
import newOrUpdatedThread from "../../triggers/new-or-updated-thread.ts";
import newThread from "../../triggers/new-thread.ts";
import newWorkspace from "../../triggers/new-workspace.ts";
import newWorkspaceUser from "../../triggers/new-workspace-user.ts";

const ids = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ id: from + i }));

describe("whole-collection snapshot triggers hold past 200 records", () => {
  const cases = [
    { key: "new-workspace-user", trigger: newWorkspaceUser, params: { workspaceId: 5 } },
    { key: "new-channel", trigger: newChannel, params: { workspaceId: 5 } },
    { key: "new-group", trigger: newGroup, params: { workspaceId: 5 } },
    { key: "new-workspace", trigger: newWorkspace, params: {} },
  ];
  for (const c of cases) {
    test(`${c.key}: 450 unchanged records stay quiet for 8 checks, then only the one new record fires`, async () => {
      const input = { params: c.params, subscriptionId: "sub-1" };
      const all = ids(1, 450);
      const seeded = await c.trigger.poll!({ ...input, state: {} }, mockCtx([{ body: all }]).ctx);
      assertEquals(seeded.events, []);
      let state = seeded.nextState;
      for (let tick = 0; tick < 8; tick++) {
        const out = await c.trigger.poll!({ ...input, state }, mockCtx([{ body: all }]).ctx);
        assertEquals(out.events, []);
        state = out.nextState;
      }
      // Record 1 is edited in place: an edit is not a "new" record.
      const grown = [{ id: 1, name: "renamed" }, ...all.slice(1), { id: 451 }];
      const out = await c.trigger.poll!({ ...input, state }, mockCtx([{ body: grown }]).ctx);
      assertEquals(out.events, [{ id: 451 }]);
      const after = await c.trigger.poll!(
        { ...input, state: out.nextState },
        mockCtx([{ body: grown }]).ctx,
      );
      assertEquals(after.events, []);
    });
  }

  test("a snapshot collection of more than 5000 records throws instead of truncating", async () => {
    let failure = "";
    try {
      await newWorkspace.poll!(
        { params: {}, subscriptionId: "s", state: {} },
        mockCtx([{ body: ids(1, 5001) }]).ctx,
      );
    } catch (err) {
      failure = (err as Error).message;
    }
    assertEquals(failure.includes("5001 rows exceeds the 5000-row cap"), true);
  });
});

describe("threads and conversations: created vs. active", () => {
  test("new-thread orders by id (after_id=1): a reply to an old thread is not 'new'", async () => {
    const input = { params: { channelId: 5 }, subscriptionId: "s" };
    // Twist orders by thread id here, so the newest 100 created are 150..51 on both checks.
    const top = ids(51, 150).reverse();
    const seed = mockCtx([{ body: top }]);
    const seeded = await newThread.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(
      seed.calls[0].url,
      "https://api.twist.com/api/v3/threads/get?channel_id=5&limit=100&after_id=1&order_by=desc",
    );
    // Thread 3 got a reply; by id ordering it is still outside the newest-created 100.
    const quiet = await newThread.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: top }]).ctx,
    );
    assertEquals(quiet.events, []);
    const created = await newThread.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: [{ id: 151 }, ...top.slice(0, 99)] }]).ctx,
    );
    assertEquals(created.events, [{ id: 151 }]);
  });

  test("new-conversation asks for id ordering, too", async () => {
    const m = mockCtx([{ body: [{ id: 9 }] }]);
    await newConversation.poll!(
      { params: { workspaceId: 5 }, subscriptionId: "s", state: {} },
      m.ctx,
    );
    assertEquals(
      m.calls[0].url,
      "https://api.twist.com/api/v3/conversations/get?workspace_id=5&limit=100&after_id=1&order_by=desc",
    );
  });

  const siblings = [
    {
      key: "new-or-updated-thread",
      trigger: newOrUpdatedThread,
      params: { channelId: 5 },
      stamp: "last_updated_ts",
    },
    {
      key: "new-or-updated-conversation",
      trigger: newOrUpdatedConversation,
      params: { workspaceId: 5 },
      stamp: "last_active_ts",
    },
    {
      key: "new-or-updated-inbox-thread",
      trigger: newOrUpdatedInboxThread,
      params: { workspaceId: 5 },
      stamp: "last_updated_ts",
    },
  ];
  for (const c of siblings) {
    test(`${c.key}: an old record with new activity is emitted once; unchanged ones are not`, async () => {
      const input = { params: c.params, subscriptionId: "s" };
      const row = (id: number, ts: number) => ({ id, [c.stamp]: ts });
      const seeded = await c.trigger.poll!(
        { ...input, state: {} },
        mockCtx([{ body: [row(2, 200), row(1, 100)] }]).ctx,
      );
      assertEquals(seeded.events, []);
      const page = [row(1, 300), row(2, 200)];
      const first = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body: page }]).ctx,
      );
      assertEquals(first.events, [row(1, 300)]);
      const next = await c.trigger.poll!(
        { ...input, state: first.nextState },
        mockCtx([{ body: page }]).ctx,
      );
      assertEquals(next.events, []);
    });
  }
});
