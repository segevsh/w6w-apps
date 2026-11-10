import { afterEach, test } from "node:test";
import type { TriggerDefinition } from "@w6w/types";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newTeam from "../../triggers/new-team.ts";
import newChannel from "../../triggers/new-channel.ts";
import newTeamMember from "../../triggers/new-team-member.ts";
import newChannelMember from "../../triggers/new-channel-member.ts";
import newChat from "../../triggers/new-chat.ts";
import newChatMessage from "../../triggers/new-chat-message.ts";
import newOrUpdatedChatMessage from "../../triggers/new-or-updated-chat-message.ts";
import { clock, TEAMS_MIN_INTERVAL_MS } from "../../lib/triggers.ts";

const SUB = "sub";
const GRAPH = "https://graph.microsoft.com/v1.0";
const page = (value: unknown[], nextLink?: string) => ({
  body: { value, ...(nextLink ? { "@odata.nextLink": nextLink } : {}) },
});
const run = (
  trigger: TriggerDefinition<never>,
  params: Record<string, unknown>,
  state: unknown,
  r: ReturnType<typeof mockCtx>,
) => trigger.poll!({ params, state, subscriptionId: SUB } as never, r.ctx);

// ---------------------------------------------------------------------------------------------
// Snapshot triggers: new-team, new-channel, new-team-member, new-channel-member
// ---------------------------------------------------------------------------------------------

const row = (id: string, name = id) => ({ id, displayName: name });

const SNAPSHOTS = [
  {
    trigger: newTeam,
    params: {},
    url: `${GRAPH}/me/joinedTeams`,
    noun: "teams",
  },
  {
    trigger: newChannel,
    params: { teamId: "team" },
    url: `${GRAPH}/teams/team/channels`,
    noun: "channels",
  },
  {
    trigger: newTeamMember,
    params: { teamId: "team" },
    url: `${GRAPH}/teams/team/members?%24top=500`,
    noun: "team members",
  },
  {
    trigger: newChannelMember,
    params: { teamId: "team", channelId: "channel" },
    url: `${GRAPH}/teams/team/channels/channel/members?%24top=500`,
    noun: "channel members",
  },
] as const;

for (const { trigger, params, url, noun } of SNAPSHOTS) {
  const t = trigger as unknown as TriggerDefinition<never>;
  const k = t.key;

  test(`${k} declares non-empty output and sample, and is a poll trigger`, () => {
    assertEquals(t.output!.length > 0, true);
    assertEquals(t.sample !== undefined, true);
    assertEquals("onSubscribe" in t, false);
    assertEquals(t.minIntervalMs, 86_400_000);
  });

  test(`${k} 1 first check seeds and emits nothing`, async () => {
    const out = await run(t, params, {}, mockCtx([page([row("a")])]));
    assertEquals(out.events, []);
    assertEquals((out.nextState as { seeded: boolean }).seeded, true);
  });

  test(`${k} 2 a row added after the seed is emitted, once`, async () => {
    const seed = await run(t, params, {}, mockCtx([page([row("a")])]));
    const out = await run(t, params, seed.nextState, mockCtx([page([row("a"), row("b")])]));
    assertEquals(out.events, [row("b")]);
    const again = await run(t, params, out.nextState, mockCtx([page([row("a"), row("b")])]));
    assertEquals(again.events, []);
  });

  test(`${k} 3 the same state and response give the same result`, async () => {
    const seed = await run(t, params, {}, mockCtx([page([row("a")])]));
    const one = await run(t, params, seed.nextState, mockCtx([page([row("a"), row("b")])]));
    const two = await run(t, params, seed.nextState, mockCtx([page([row("a"), row("b")])]));
    assertEquals(one, two);
  });

  test(`${k} 4 the request is a literal GET`, async () => {
    const r = mockCtx([page([row("a")])]);
    await run(t, params, {}, r);
    assertEquals(r.calls.length, 1);
    assertEquals(r.calls[0], { method: "GET", url, headers: {}, body: null });
  });

  test(`${k} 5 a renamed row is not a new row`, async () => {
    const seed = await run(t, params, {}, mockCtx([page([row("a")])]));
    const out = await run(t, params, seed.nextState, mockCtx([page([row("a", "Renamed")])]));
    assertEquals(out.events, []);
  });

  test(`${k} 6 follows the next link, so a row on page 2 is part of the snapshot`, async () => {
    const next = `${GRAPH}/next?%24skiptoken=abc`;
    const seed = await run(t, params, {}, mockCtx([page([row("a")], next), page([row("b")])]));
    const r = mockCtx([page([row("a")], next), page([row("b")])]);
    const out = await run(t, params, seed.nextState, r);
    assertEquals(out.events, []);
    assertEquals(r.calls[1].url, next);
  });

  test(`${k} 7 a list longer than the page budget fails the check loudly`, async () => {
    const next = `${GRAPH}/next?%24skiptoken=more`;
    const pages = Array.from({ length: 10 }, () => page([row("a")], next));
    let message = "";
    try {
      await run(t, params, {}, mockCtx(pages));
    } catch (e) {
      message = (e as Error).message;
    }
    assertEquals(
      message,
      `more than 10 pages of ${noun} in one list; this trigger cannot snapshot it`,
    );
  });
}

// ---------------------------------------------------------------------------------------------
// new-chat: newest-activity-first over GET /me/chats, with the seed floor (§9.9)
// ---------------------------------------------------------------------------------------------

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});
const SEED_MS = Date.parse("2026-11-09T12:00:00Z");
const BEFORE = "2026-11-01T08:00:00Z";
const AFTER = "2026-11-09T12:30:00Z";
const chat = (id: string, createdDateTime: string) => ({ id, chatType: "group", createdDateTime });
const chatsPage = (chats: unknown[], nextLink?: string) => page(chats, nextLink);
const NEW_CHAT_URL =
  `${GRAPH}/me/chats?%24orderby=lastMessagePreview%2FcreatedDateTime+desc&%24top=50`;

test("new-chat declares non-empty output and sample, and is a poll trigger", () => {
  assertEquals(newChat.output!.length > 0, true);
  assertEquals(newChat.sample !== undefined, true);
  assertEquals("onSubscribe" in newChat, false);
  assertEquals(newChat.minIntervalMs, 86_400_000);
});

test("new-chat 1 first check records the floor, reads nothing, emits nothing", async () => {
  clock.now = () => SEED_MS;
  const r = mockCtx([]);
  const out = await run(newChat as never, {}, {}, r);
  assertEquals(out.events, []);
  assertEquals(r.calls.length, 0);
  assertEquals(out.nextState, { v: 1, kind: "ids", seeded: true, ids: [], floor: SEED_MS });
});

test("new-chat 2 a chat created after the seed is emitted", async () => {
  clock.now = () => SEED_MS;
  const seed = await run(newChat as never, {}, {}, mockCtx([]));
  const out = await run(
    newChat as never,
    {},
    seed.nextState,
    mockCtx([chatsPage([chat("new", AFTER), chat("old", BEFORE)])]),
  );
  assertEquals(out.events, [chat("new", AFTER)]);
});

test("new-chat 3 the same state and response give the same result", async () => {
  clock.now = () => SEED_MS;
  const seed = await run(newChat as never, {}, {}, mockCtx([]));
  const resp = () => mockCtx([chatsPage([chat("new", AFTER), chat("old", BEFORE)])]);
  const one = await run(newChat as never, {}, seed.nextState, resp());
  const two = await run(newChat as never, {}, seed.nextState, resp());
  assertEquals(one, two);
});

test("new-chat 4 the request is a literal GET /me/chats ordered by last message, 50 a page", async () => {
  clock.now = () => SEED_MS;
  const seed = await run(newChat as never, {}, {}, mockCtx([]));
  const r = mockCtx([chatsPage([])]);
  await run(newChat as never, {}, seed.nextState, r);
  assertEquals(r.calls[0], { method: "GET", url: NEW_CHAT_URL, headers: {}, body: null });
});

test("new-chat 5 (9.9) three full pages of chats from before the seed emit nothing, then one new chat is emitted", async () => {
  clock.now = () => SEED_MS;
  const seed = await run(newChat as never, {}, {}, mockCtx([]));
  const block = (from: number) =>
    Array.from({ length: 50 }, (_, i) => chat(`old${from + i}`, BEFORE));
  const n1 = `${GRAPH}/me/chats?%24skiptoken=1`;
  const n2 = `${GRAPH}/me/chats?%24skiptoken=2`;
  const n3 = `${GRAPH}/me/chats?%24skiptoken=3`;
  const r = mockCtx([
    chatsPage(block(0), n1),
    chatsPage(block(50), n2),
    chatsPage(block(100), n3), // a 4th page exists but is not read
  ]);
  const one = await run(newChat as never, {}, seed.nextState, r);
  assertEquals(one.events, []);
  assertEquals(r.calls.length, 3);
  assertEquals(r.calls[1].url, n1);
  assertEquals(r.calls[2].url, n2);
  assertEquals((one.nextState as { ids: string[] }).ids.length, 150);

  // An old chat that now has a message and jumps to the top is NOT a new chat.
  const two = await run(
    newChat as never,
    {},
    one.nextState,
    mockCtx([chatsPage([chat("old999", BEFORE), ...block(0).slice(0, 49)])]),
  );
  assertEquals(two.events, []);

  // A chat created after the seed is the only event.
  const three = await run(
    newChat as never,
    {},
    two.nextState,
    mockCtx([chatsPage([chat("fresh", AFTER), chat("old999", BEFORE)])]),
  );
  assertEquals(three.events, [chat("fresh", AFTER)]);
});

test("new-chat 6 a chat with no parseable created time is kept", async () => {
  clock.now = () => SEED_MS;
  const seed = await run(newChat as never, {}, {}, mockCtx([]));
  const out = await run(
    newChat as never,
    {},
    seed.nextState,
    mockCtx([chatsPage([{ id: "undated" }])]),
  );
  assertEquals(out.events, [{ id: "undated" }]);
});

// ---------------------------------------------------------------------------------------------
// new-chat-message / new-or-updated-chat-message: newest-first over GET /chats/{id}/messages
// ---------------------------------------------------------------------------------------------

const msg = (id: string, modified = "2026-11-09T12:00:00Z") => ({
  id,
  createdDateTime: "2026-11-09T12:00:00Z",
  lastModifiedDateTime: modified,
});

test("new-chat-message and new-or-updated-chat-message declare output, sample and a required chatId", () => {
  for (const t of [newChatMessage, newOrUpdatedChatMessage]) {
    assertEquals(t.output!.length > 0, true);
    assertEquals(t.sample !== undefined, true);
    assertEquals(t.params!.map((p) => [p.key, p.required]), [["chatId", true]]);
    assertEquals("onSubscribe" in t, false);
    assertEquals(t.minIntervalMs, TEAMS_MIN_INTERVAL_MS);
    assertEquals(t.minIntervalMs, 86_400_000);
  }
});

test("new-chat-message 1 first check seeds and emits nothing", async () => {
  const out = await run(
    newChatMessage as never,
    { chatId: "chat" },
    {},
    mockCtx([page([msg("old")])]),
  );
  assertEquals(out.events, []);
  assertEquals((out.nextState as { seeded: boolean }).seeded, true);
});

test("new-chat-message 2 a message after the seed is emitted", async () => {
  const seed = await run(
    newChatMessage as never,
    { chatId: "chat" },
    {},
    mockCtx([page([msg("old")])]),
  );
  const out = await run(
    newChatMessage as never,
    { chatId: "chat" },
    seed.nextState,
    mockCtx([page([msg("new"), msg("old")])]),
  );
  assertEquals(out.events, [msg("new")]);
});

test("new-chat-message 3 the same state and response give the same result", async () => {
  const seed = await run(
    newChatMessage as never,
    { chatId: "chat" },
    {},
    mockCtx([page([msg("old")])]),
  );
  const resp = () => mockCtx([page([msg("new"), msg("old")])]);
  const one = await run(newChatMessage as never, { chatId: "chat" }, seed.nextState, resp());
  const two = await run(newChatMessage as never, { chatId: "chat" }, seed.nextState, resp());
  assertEquals(one, two);
});

test("new-chat-message 4 the request is a literal createdDateTime-descending list, 50 a page", async () => {
  const r = mockCtx([page([])]);
  await run(newChatMessage as never, { chatId: "19:abc@thread.v2" }, {}, r);
  assertEquals(r.calls[0], {
    method: "GET",
    url: `${GRAPH}/chats/19%3Aabc%40thread.v2/messages?%24orderby=createdDateTime+desc&%24top=50`,
    headers: {},
    body: null,
  });
});

test("new-or-updated-chat-message 1 first check seeds and emits nothing", async () => {
  const out = await run(
    newOrUpdatedChatMessage as never,
    { chatId: "chat" },
    {},
    mockCtx([page([msg("old")])]),
  );
  assertEquals(out.events, []);
  assertEquals((out.nextState as { seeded: boolean }).seeded, true);
});

test("new-or-updated-chat-message 2 a new message and an edited one are each emitted once", async () => {
  const params = { chatId: "chat" };
  const seed = await run(
    newOrUpdatedChatMessage as never,
    params,
    {},
    mockCtx([page([msg("old")])]),
  );
  const edited = msg("old", "2026-11-09T12:10:00Z");
  const out = await run(
    newOrUpdatedChatMessage as never,
    params,
    seed.nextState,
    mockCtx([page([msg("new", "2026-11-09T12:20:00Z"), edited])]),
  );
  assertEquals(out.events, [edited, msg("new", "2026-11-09T12:20:00Z")]);
  const again = await run(
    newOrUpdatedChatMessage as never,
    params,
    out.nextState,
    mockCtx([page([msg("new", "2026-11-09T12:20:00Z"), edited])]),
  );
  assertEquals(again.events, []);
});

test("new-or-updated-chat-message 3 the same state and response give the same result", async () => {
  const params = { chatId: "chat" };
  const seed = await run(
    newOrUpdatedChatMessage as never,
    params,
    {},
    mockCtx([page([msg("old")])]),
  );
  const resp = () => mockCtx([page([msg("old", "2026-11-09T12:10:00Z")])]);
  const one = await run(newOrUpdatedChatMessage as never, params, seed.nextState, resp());
  const two = await run(newOrUpdatedChatMessage as never, params, seed.nextState, resp());
  assertEquals(one, two);
});

test("new-or-updated-chat-message 4 the request is a literal lastModifiedDateTime-descending list", async () => {
  const r = mockCtx([page([])]);
  await run(newOrUpdatedChatMessage as never, { chatId: "chat" }, {}, r);
  assertEquals(r.calls[0], {
    method: "GET",
    url: `${GRAPH}/chats/chat/messages?%24orderby=lastModifiedDateTime+desc&%24top=50`,
    headers: {},
    body: null,
  });
});
