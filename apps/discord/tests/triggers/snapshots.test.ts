import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newGuild from "../../triggers/new-guild.ts";
import newChannel from "../../triggers/new-channel.ts";
import newRole from "../../triggers/new-role.ts";
import newMember from "../../triggers/new-member.ts";

/**
 * Bounded-collection snapshots over the app's list actions (https://discord.com/developers/docs/
 * resources/user#get-current-user-guilds, guild#get-guild-channels, guild#get-guild-roles,
 * guild#list-guild-members; verified 2026-11-10). Every request URL below is a literal.
 */
const API = "https://discord.com/api/v10";
const g = (id: string) => ({ id, name: `guild ${id}` });
const m = (id: string) => ({ user: { id, username: `user-${id}` }, roles: [] });

const CASES = [
  {
    trigger: newGuild,
    params: {},
    url: `${API}/users/@me/guilds?limit=200`,
    item: g,
    idOf: (x: { id: string }) => x.id,
  },
  {
    trigger: newChannel,
    params: { guildId: "g1" },
    url: `${API}/guilds/g1/channels`,
    item: (id: string) => ({ id, name: `channel-${id}`, type: 0 }),
    idOf: (x: { id: string }) => x.id,
  },
  {
    trigger: newRole,
    params: { guildId: "g1" },
    url: `${API}/guilds/g1/roles`,
    item: (id: string) => ({ id, name: `role ${id}`, position: 1 }),
    idOf: (x: { id: string }) => x.id,
  },
  {
    trigger: newMember,
    params: { guildId: "g1" },
    url: `${API}/guilds/g1/members?limit=1000`,
    item: m,
    idOf: (x: { user: { id: string } }) => x.user.id,
  },
];

for (const c of CASES) {
  const key = c.trigger.key;
  // deno-lint-ignore no-explicit-any
  const poll = (c.trigger as any).poll as (i: unknown, ctx: unknown) => Promise<any>;
  const input = (state: unknown) => ({ params: c.params, state, subscriptionId: "sub-1" });

  test(`${key}: declared as a poll with output, sample and no onSubscribe`, () => {
    assertEquals((c.trigger.output?.length ?? 0) > 0, true);
    assertEquals(c.trigger.sample !== undefined, true);
    assertEquals(typeof c.trigger.poll, "function");
    assertEquals("onSubscribe" in c.trigger, false);
  });

  test(`${key}: seeds without firing, emits only an id added later, retries idempotently`, async () => {
    const seed = mockCtx([{ body: [c.item("a"), c.item("b")] }]);
    const seeded = await poll(input({}), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seeded.nextState.seeded, true);
    assertEquals([seed.calls[0].method, seed.calls[0].url], ["GET", c.url]);

    const page = [c.item("a"), c.item("b"), c.item("c")];
    const first = await poll(input(seeded.nextState), mockCtx([{ body: page }]).ctx);
    const retry = await poll(input(seeded.nextState), mockCtx([{ body: page }]).ctx);
    assertEquals(first.events.map((e: { change: string; key: string }) => [e.change, e.key]), [[
      "added",
      "c",
    ]]);
    assertEquals(first.events[0].values, c.item("c"));
    assertEquals(retry, first);
  });

  test(`${key}: an edited or removed record is not announced as new`, async () => {
    const seeded = await poll(
      input({}),
      mockCtx([{ body: [c.item("a"), c.item("b")] }]).ctx,
    );
    const edited = { ...c.item("a"), name: "renamed" };
    const out = await poll(input(seeded.nextState), mockCtx([{ body: [edited] }]).ctx);
    assertEquals(out.events, []);
  });
}

test("new-guild: pages through guilds 200 at a time with the after cursor", async () => {
  const full = Array.from({ length: 200 }, (_, i) => g(String(1000 + i)));
  const seed = mockCtx([{ body: full }, { body: [g("1200")] }]);
  const seeded = await newGuild.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seed.calls.map((c) => c.url), [
    `${API}/users/@me/guilds?limit=200`,
    `${API}/users/@me/guilds?limit=200&after=1199`,
  ]);
  const next = mockCtx([{ body: full }, { body: [g("1200"), g("1201")] }]);
  const out = await newGuild.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    next.ctx,
  );
  assertEquals(out.events.map((e) => (e as { key: string }).key), ["1201"]);
});

test("new-member: pages by user id, and a server over 5000 members fails loudly", async () => {
  const page = (from: number) => Array.from({ length: 1000 }, (_, i) => m(String(from + i)));
  const one = mockCtx([{ body: page(1000) }, { body: [m("2000")] }]);
  const seeded = await newMember.poll!(
    { params: { guildId: "g1" }, state: {}, subscriptionId: "s" },
    one.ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(one.calls.map((c) => c.url), [
    `${API}/guilds/g1/members?limit=1000`,
    `${API}/guilds/g1/members?limit=1000&after=1999`,
  ]);

  const big = mockCtx(Array.from({ length: 6 }, (_, i) => ({ body: page(10000 + i * 1000) })));
  await assertRejects(
    async () =>
      await newMember.poll!({ params: { guildId: "g1" }, state: {}, subscriptionId: "s" }, big.ctx),
    Error,
    "5000",
  );
});
