import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { TriggerDefinition } from "@w6w/types";
import newContact from "../../triggers/new-contact.ts";
import newConversation from "../../triggers/new-conversation.ts";
import newGroup from "../../triggers/new-group.ts";
import newUser from "../../triggers/new-user.ts";
import newTag from "../../triggers/new-tag.ts";

const input = { params: {}, subscriptionId: "sub-1" };

interface Case {
  key: string;
  trigger: TriggerDefinition;
  listKey: string;
  idField: string;
  path: string;
  query: Record<string, string>;
}

const cases: Case[] = [
  {
    key: "new-contact",
    trigger: newContact,
    listKey: "contact_list",
    idField: "contact_id",
    path: "/v2/contacts",
    query: { limit_count: "500", limit_offset: "0" },
  },
  {
    key: "new-conversation",
    trigger: newConversation,
    listKey: "conversation_list",
    idField: "conversation_id",
    path: "/v2/conversations",
    query: { limit_count: "1000", limit_offset: "0" },
  },
  {
    key: "new-group",
    trigger: newGroup,
    listKey: "list",
    idField: "group_id",
    path: "/v2/groups",
    query: { limit_count: "1000", limit_offset: "0" },
  },
  {
    key: "new-user",
    trigger: newUser,
    listKey: "list",
    idField: "user_id",
    path: "/v2/users",
    query: {},
  },
  {
    key: "new-tag",
    trigger: newTag,
    listKey: "list",
    idField: "tag_id",
    path: "/v2/tags",
    query: {},
  },
];

const body = (c: Case, ids: number[]) => ({
  body: { [c.listKey]: ids.map((id) => ({ [c.idField]: id })) },
});

for (const c of cases) {
  test(`${c.key}: the first check seeds without emitting`, async () => {
    const seeded = await c.trigger.poll!({ ...input, state: {} }, mockCtx([body(c, [1])]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  });

  test(`${c.key}: a new record is emitted once and a retry repeats it identically`, async () => {
    const seeded = await c.trigger.poll!({ ...input, state: {} }, mockCtx([body(c, [1])]).ctx);
    const first = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([body(c, [2, 1])]).ctx,
    );
    const retry = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([body(c, [2, 1])]).ctx,
    );
    assertEquals(first.events, [{ [c.idField]: 2 }]);
    assertEquals(retry, first);
  });

  test(`${c.key}: requests the literal list endpoint`, async () => {
    const m = mockCtx([body(c, [1])]);
    await c.trigger.poll!({ ...input, state: {} }, m.ctx);
    assertEquals(m.calls.length, 1);
    const url = new URL(m.calls[0].url);
    assertEquals({
      method: m.calls[0].method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
    }, { method: "GET", path: c.path, query: c.query });
  });
}

const contact = cases.find((c) => c.key === "new-contact")!;
const ids = (from: number, n: number) => Array.from({ length: n }, (_, i) => from + i);

test("new-contact: pages by offset until a short page and emits a contact found on page 2", async () => {
  const seedCtx = mockCtx([body(contact, ids(1, 500)), body(contact, [501])]);
  const seeded = await contact.trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals(
    seedCtx.calls.map((c) => Object.fromEntries(new URL(c.url).searchParams)),
    [
      { limit_count: "500", limit_offset: "0" },
      { limit_count: "500", limit_offset: "500" },
    ],
  );
  const next = await contact.trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([body(contact, ids(1, 500)), body(contact, [501, 502])]).ctx,
  );
  assertEquals(next.events, [{ contact_id: 502 }]);
});

test("new-contact: an address book of 5000 or more fails loudly instead of being half-read", async () => {
  const pages = Array.from({ length: 10 }, (_, i) => body(contact, ids(i * 500 + 1, 500)));
  await assertRejects(
    () => contact.trigger.poll!({ ...input, state: {} }, mockCtx(pages).ctx),
    Error,
    "5000 records",
  );
});

test("new-contact: a 204 (no contacts) is an empty collection", async () => {
  const seeded = await contact.trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ status: 204 }]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});
