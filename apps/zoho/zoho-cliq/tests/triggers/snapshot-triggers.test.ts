import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newChannel from "../../triggers/new-channel.ts";
import newChannelMember from "../../triggers/new-channel-member.ts";
import newChatMember from "../../triggers/new-chat-member.ts";
import newReminder from "../../triggers/new-reminder.ts";
import newTeam from "../../triggers/new-team.ts";
import newUser from "../../triggers/new-user.ts";
import newUserTeam from "../../triggers/new-user-team.ts";
import type { TriggerDefinition } from "@w6w/types";

const BASE = "https://cliq.zoho.com/api/v2";

interface Case {
  name: string;
  trigger: TriggerDefinition;
  params: Record<string, unknown>;
  /** Literal URL of the (single) request one check makes. */
  url: string;
  /** Response body for a page holding exactly the given ids. */
  body(ids: string[]): unknown;
  /** The record a given id becomes in `events`. */
  event(id: string): unknown;
}

const cases: Case[] = [
  {
    name: "new-channel",
    trigger: newChannel,
    params: {},
    url: `${BASE}/channels?limit=100`,
    body: (ids) => ({
      channels: ids.map((channel_id) => ({ channel_id, name: `#${channel_id}` })),
    }),
    event: (channel_id) => ({ channel_id, name: `#${channel_id}` }),
  },
  {
    name: "new-user",
    trigger: newUser,
    params: {},
    url: `${BASE}/users?limit=100`,
    body: (ids) => ({ has_more: false, data: ids.map((id) => ({ id, name: `User ${id}` })) }),
    event: (id) => ({ id, name: `User ${id}` }),
  },
  {
    name: "new-team",
    trigger: newTeam,
    params: {},
    url: `${BASE}/teams`,
    body: (ids) => ({ teams: ids.map((team_id) => ({ team_id, name: `Team ${team_id}` })) }),
    event: (team_id) => ({ team_id, name: `Team ${team_id}` }),
  },
  {
    name: "new-user-team",
    trigger: newUserTeam,
    params: { userId: "U1" },
    url: `${BASE}/users/U1/teams`,
    body: (ids) => ({ data: ids.map((team_id) => ({ team_id, name: `Team ${team_id}` })) }),
    event: (team_id) => ({ team_id, name: `Team ${team_id}` }),
  },
  {
    name: "new-channel-member",
    trigger: newChannelMember,
    params: { channelId: "CH1" },
    url: `${BASE}/channels/CH1/members`,
    body: (ids) => ({ members: ids.map((user_id) => ({ user_id, name: `User ${user_id}` })) }),
    event: (user_id) => ({ user_id, name: `User ${user_id}` }),
  },
  {
    name: "new-chat-member",
    trigger: newChatMember,
    params: { chatId: "CT_1" },
    url: `${BASE}/chats/CT_1/members?fields=name%2Cemail_id%2Cuser_id`,
    body: (ids) => ({ members: ids.map((user_id) => ({ user_id, name: `User ${user_id}` })) }),
    event: (user_id) => ({ user_id, name: `User ${user_id}` }),
  },
  {
    name: "new-reminder",
    trigger: newReminder,
    params: { category: "others" },
    url: `${BASE}/reminders?category=others&limit=100`,
    body: (ids) => ({ category: "others", list: ids.map((id) => ({ id, content: `Todo ${id}` })) }),
    event: (id) => ({ id, content: `Todo ${id}` }),
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const poll = async (state: unknown, ids: string[]) => {
      const m = mockCtx([{ body: c.body(ids) }]);
      const r = await c.trigger.poll!({ params: c.params, state, subscriptionId: "s" }, m.ctx);
      return { r, calls: m.calls };
    };

    test("seeds without events, then emits only the new record, idempotently", async () => {
      const seeded = await poll({}, ["a", "b"]);
      assertEquals(seeded.r.events, []);
      assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
      const first = await poll(seeded.r.nextState, ["a", "b", "c"]);
      const retry = await poll(seeded.r.nextState, ["a", "b", "c"]);
      assertEquals(first.r.events, [c.event("c")]);
      assertEquals(retry.r, first.r);
    });

    test("a removed record is not an event", async () => {
      const seeded = await poll({}, ["a", "b"]);
      assertEquals((await poll(seeded.r.nextState, ["a"])).r.events, []);
    });

    test("sends the literal request of the wrapped list action", async () => {
      const { calls } = await poll({}, ["a"]);
      assertEquals(calls.length, 1);
      assertEquals(calls[0].method, "GET");
      assertEquals(calls[0].url, c.url);
      assertEquals(calls[0].body, null);
    });
  });
}

test("new-channel: follows next_token until the last page and diffs the union", async () => {
  const ch = (channel_id: string) => ({ channel_id, name: channel_id });
  const run = async (state: unknown, pages: unknown[]) => {
    const m = mockCtx(pages.map((body) => ({ body })));
    const r = await newChannel.poll!({ params: {}, state, subscriptionId: "s" }, m.ctx);
    return { r, calls: m.calls };
  };
  const pages = (extra: string[]) => [
    { has_more: true, next_token: "tok-1", channels: [ch("a"), ch("b")] },
    { has_more: false, channels: [ch("c"), ...extra.map(ch)] },
  ];
  const seeded = await run({}, pages([]));
  assertEquals(seeded.r.events, []);
  assertEquals(seeded.calls.map((x) => x.url), [
    `${BASE}/channels?limit=100`,
    `${BASE}/channels?limit=100&next_token=tok-1`,
  ]);
  const next = await run(seeded.r.nextState, pages(["d"]));
  assertEquals(next.r.events, [ch("d")]);
});

test("new-user: stops at has_more=false and ignores a stale next_token", async () => {
  const m = mockCtx([{ body: { has_more: false, next_token: "stale", data: [{ id: "1" }] } }]);
  const r = await newUser.poll!({ params: {}, state: {}, subscriptionId: "s" }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(r.events, []);
});

test("new-reminder: follows next_set_token and defaults the category to mine", async () => {
  const m = mockCtx([
    { body: { category: "mine", list: [{ id: "1" }], next_set_token: 17 } },
    { body: { category: "mine", list: [{ id: "2" }] } },
  ]);
  await newReminder.poll!({ params: {}, state: {}, subscriptionId: "s" }, m.ctx);
  assertEquals(m.calls.map((x) => x.url), [
    `${BASE}/reminders?category=mine&limit=100`,
    `${BASE}/reminders?category=mine&limit=100&next_set_token=17`,
  ]);
});

test("new-channel: a list longer than 50 pages throws instead of diffing a partial list", async () => {
  const pageOf = (n: number) => ({
    body: { has_more: true, next_token: `t${n}`, channels: [{ channel_id: `c${n}` }] },
  });
  const m = mockCtx(Array.from({ length: 50 }, (_, n) => pageOf(n)));
  await assertRejects(() =>
    newChannel.poll!({ params: {}, state: {}, subscriptionId: "s" }, m.ctx)
  );
});
