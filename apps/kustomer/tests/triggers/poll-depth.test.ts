import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockKustomerCtx } from "../_helpers.ts";
import newKobject from "../../triggers/new-kobject.ts";
import newMessage from "../../triggers/new-message.ts";
import newNote from "../../triggers/new-note.ts";
import newTeam from "../../triggers/new-team.ts";
import newUser from "../../triggers/new-user.ts";

const BASE = "https://acme.api.kustomerapp.com/v1";
const item = (id: string) => ({ id, type: "x", attributes: {} });
const page = (ids: string[]) => ({ data: ids.map(item) });

const cases = [
  {
    trigger: newKobject,
    params: { name: "order" },
    url: `${BASE}/klasses/order?page=1&pageSize=100&sort=desc`,
  },
  {
    trigger: newMessage,
    params: { conversationId: "c1" },
    url: `${BASE}/conversations/c1/messages?page=1&pageSize=100`,
  },
  {
    trigger: newNote,
    params: { conversationId: "c1" },
    url: `${BASE}/conversations/c1/notes?page=1&pageSize=100`,
  },
  { trigger: newTeam, params: {}, url: `${BASE}/teams?page=1&pageSize=100&deleted=false` },
  { trigger: newUser, params: {}, url: `${BASE}/users?page=1&pageSize=100&deleted=false` },
];

for (const c of cases) {
  const key = c.trigger.key;
  const run = async (state: unknown, ids: string[]) => {
    const mock = mockKustomerCtx([{ body: page(ids) }]);
    const result = await c.trigger.poll!(
      { params: c.params, subscriptionId: "sub-1", state },
      mock.ctx,
    );
    return { result, calls: mock.calls };
  };

  test(`${key}: the first check seeds without emitting`, async () => {
    const { result } = await run({}, ["a"]);
    assertEquals(result.events, []);
    assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
  });

  test(`${key}: a new record is emitted once and a retry repeats it identically`, async () => {
    const seeded = (await run({}, ["a"])).result.nextState;
    const first = await run(seeded, ["b", "a"]);
    const retry = await run(seeded, ["b", "a"]);
    assertEquals(first.result.events, [item("b")]);
    assertEquals(retry.result, first.result);
  });

  test(`${key}: requests exactly the list action's endpoint`, async () => {
    const { calls } = await run({}, ["a"]);
    assertEquals(calls.length, 1);
    assertEquals({ method: calls[0].method, url: calls[0].url }, { method: "GET", url: c.url });
  });
}

test("snapshot triggers page through the whole collection (page 2 is requested after a full page)", async () => {
  const first = Array.from({ length: 100 }, (_, i) => `u${i}`);
  const mock = mockKustomerCtx([{ body: page(first) }, { body: page(["u100"]) }]);
  const res = await newUser.poll!({ params: {}, subscriptionId: "s", state: {} }, mock.ctx);
  assertEquals(res.events, []);
  assertEquals(mock.calls.map((c) => c.url), [
    `${BASE}/users?page=1&pageSize=100&deleted=false`,
    `${BASE}/users?page=2&pageSize=100&deleted=false`,
  ]);
  // a user that only exists on page 2 is part of the snapshot, so it is not "new" later
  const again = mockKustomerCtx([{ body: page(first) }, { body: page(["u100", "u101"]) }]);
  const later = await newUser.poll!(
    { params: {}, subscriptionId: "s", state: res.nextState },
    again.ctx,
  );
  assertEquals(later.events, [item("u101")]);
});

test("conversation-scoped triggers refuse a blank parent before any request", async () => {
  for (const t of [newKobject, newMessage, newNote]) {
    const mock = mockKustomerCtx([]);
    await assertRejects(
      async () => await t.poll!({ params: {}, subscriptionId: "s", state: {} }, mock.ctx),
      Error,
    );
    assertEquals(mock.calls.length, 0);
  }
});
