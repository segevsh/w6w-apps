import { test } from "node:test";
import { deepStrictEqual as assertEquals } from "node:assert/strict";
import { mockCtx } from "../_helpers.ts";
import newConversation from "../../triggers/new-conversation.ts";
import newOrUpdatedConversation from "../../triggers/new-or-updated-conversation.ts";
import newGroupMessage from "../../triggers/new-group-message.ts";
import newGroup from "../../triggers/new-group.ts";
import newNumber from "../../triggers/new-number.ts";
import newUser from "../../triggers/new-user.ts";
import newWabaTemplate from "../../triggers/new-waba-template.ts";

const API = "https://api.p.2chat.io/open";
const run = (
  t: { poll?: (i: never, c: never) => Promise<{ events: unknown[]; nextState: unknown }> },
  params: unknown,
  state: unknown,
  bodies: unknown[],
) => {
  const m = mockCtx(bodies.map((body) => ({ body })));
  return t.poll!({ params, state, subscriptionId: "s" } as never, m.ctx as never).then((r) => ({
    r,
    calls: m.calls,
  }));
};

// --- list-backed newest-first triggers (pollFromListAction) -------------------------------------

const feeds = [
  {
    name: "new-conversation",
    trigger: newConversation,
    params: { channelUuid: "WPN1" },
    url: `${API}/whatsapp/conversations/WPN1?page_number=0`,
    wrap: (items: unknown[]) => ({ success: true, total: 99, sessions: items }),
    old: { session_key: "S-old", last_activity_at: "2026-01-01T00:00:00Z" },
    fresh: { session_key: "S-new", last_activity_at: "2026-01-02T00:00:00Z" },
  },
  {
    name: "new-or-updated-conversation",
    trigger: newOrUpdatedConversation,
    params: { channelUuid: "WPN1" },
    url: `${API}/whatsapp/conversations/WPN1?page_number=0`,
    wrap: (items: unknown[]) => ({ success: true, total: 99, sessions: items }),
    old: { session_key: "S-old", last_activity_at: "2026-01-01T00:00:00Z" },
    fresh: { session_key: "S-new", last_activity_at: "2026-01-02T00:00:00Z" },
  },
  {
    name: "new-group-message",
    trigger: newGroupMessage,
    params: { groupUuid: "WAG1" },
    url: `${API}/whatsapp/groups/messages/WAG1?page_number=0`,
    wrap: (items: unknown[]) => ({ success: true, page_number: 0, messages: items }),
    old: { uuid: "MSG-old", created_at: "2026-01-01T00:00:00" },
    fresh: { uuid: "MSG-new", created_at: "2026-01-02T00:00:00" },
  },
];

for (const f of feeds) {
  test(`${f.name}: seeds, emits only the new record, retries identically, literal request`, async () => {
    const seed = await run(f.trigger, f.params, {}, [f.wrap([f.old])]);
    assertEquals(seed.r.events, []);
    assertEquals((seed.r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, f.url);

    const a = await run(f.trigger, f.params, seed.r.nextState, [f.wrap([f.fresh, f.old])]);
    const b = await run(f.trigger, f.params, seed.r.nextState, [f.wrap([f.fresh, f.old])]);
    assertEquals(a.r.events, [f.fresh]);
    assertEquals(a.r, b.r);
    assertEquals(a.calls[0].url, f.url);
  });
}

test("new-conversation: a conversation with new activity is NOT a new conversation", async () => {
  const old = { session_key: "S1", last_activity_at: "2026-01-01T00:00:00Z" };
  const seed = await run(newConversation, { channelUuid: "WPN1" }, {}, [{ sessions: [old] }]);
  const again = await run(newConversation, { channelUuid: "WPN1" }, seed.r.nextState, [
    { sessions: [{ ...old, last_activity_at: "2026-01-03T00:00:00Z" }] },
  ]);
  assertEquals(again.r.events, []);
});

test("new-or-updated-conversation: an edited (newly active) conversation is emitted again", async () => {
  const old = { session_key: "S1", last_activity_at: "2026-01-01T00:00:00Z" };
  const seed = await run(newOrUpdatedConversation, { channelUuid: "WPN1" }, {}, [{
    sessions: [old],
  }]);
  const active = { ...old, last_activity_at: "2026-01-03T00:00:00Z" };
  const again = await run(newOrUpdatedConversation, { channelUuid: "WPN1" }, seed.r.nextState, [
    { sessions: [active, old] },
  ]);
  assertEquals(again.r.events, [active]);
});

test("new-conversation: reads page 1 (page_number=1) when page 0 holds only unseen conversations", async () => {
  const s = (id: string) => ({ session_key: id, last_activity_at: "2026-01-01T00:00:00Z" });
  const seed = await run(newConversation, { channelUuid: "WPN1" }, {}, [{ sessions: [s("a")] }]);
  const got = await run(newConversation, { channelUuid: "WPN1" }, seed.r.nextState, [
    { sessions: [s("d"), s("c")] },
    { sessions: [s("b"), s("a")] },
  ]);
  assertEquals(got.r.events, [s("b"), s("c"), s("d")]);
  assertEquals(got.calls.map((c) => c.url), [
    `${API}/whatsapp/conversations/WPN1?page_number=0`,
    `${API}/whatsapp/conversations/WPN1?page_number=1`,
  ]);
});

// --- bounded snapshot triggers (pollSnapshot) ----------------------------------------------------

const snaps = [
  {
    name: "new-group",
    trigger: newGroup,
    params: { phoneNumber: "+595981048477" },
    url: `${API}/whatsapp/groups/+595981048477`,
    wrap: (items: unknown[]) => ({ success: true, data: items }),
    a: { uuid: "WAG1", wa_group_name: "One" },
    b: { uuid: "WAG2", wa_group_name: "Two" },
  },
  {
    name: "new-number",
    trigger: newNumber,
    params: {},
    url: `${API}/whatsapp/get-numbers?status=all&page_number=0`,
    wrap: (items: unknown[]) => ({ success: true, count: items.length, page: 0, numbers: items }),
    a: { uuid: "WPN1", friendly_name: "One" },
    b: { uuid: "WPN2", friendly_name: "Two" },
  },
  {
    name: "new-user",
    trigger: newUser,
    params: {},
    url: `${API}/users`,
    wrap: (items: unknown[]) => ({ success: true, data: { users: items } }),
    a: { uuid: "USR1", first_name: "Ada" },
    b: { uuid: "USR2", first_name: "Bo" },
  },
  {
    name: "new-waba-template",
    trigger: newWabaTemplate,
    params: { phoneNumber: "+5215512345432" },
    url: `${API}/waba/templates?phone_number=%2B5215512345432&page=0&limit=200`,
    wrap: (items: unknown[]) => ({ success: true, templates: items, total: 2, next_page: null }),
    a: { uuid: "TPL1", name: "one" },
    b: { uuid: "TPL2", name: "two" },
  },
];

for (const s of snaps) {
  test(`${s.name}: seeds without events, emits only the added record, retries identically, literal request`, async () => {
    const seed = await run(s.trigger, s.params, {}, [s.wrap([s.a])]);
    assertEquals(seed.r.events, []);
    assertEquals((seed.r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, s.url);

    const x = await run(s.trigger, s.params, seed.r.nextState, [s.wrap([s.a, s.b])]);
    const y = await run(s.trigger, s.params, seed.r.nextState, [s.wrap([s.a, s.b])]);
    assertEquals(x.r.events, [s.b]);
    assertEquals(x.r, y.r);

    const removed = await run(s.trigger, s.params, x.r.nextState, [s.wrap([s.b])]);
    assertEquals(removed.r.events, []);
  });
}
