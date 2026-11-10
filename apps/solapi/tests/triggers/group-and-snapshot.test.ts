import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import type { TriggerDefinition } from "@w6w/types";
import newGroup from "../../triggers/new-group.ts";
import newOrUpdatedGroup from "../../triggers/new-or-updated-group.ts";
import newSenderNumber from "../../triggers/new-sender-number.ts";
import newKakaoChannel from "../../triggers/new-kakao-channel.ts";
import newKakaoTemplate from "../../triggers/new-kakao-template.ts";
import { clock } from "../../lib/since-poll.ts";

const B = "https://api.solapi.com";
const input = { params: {}, subscriptionId: "sub-1" };
const T0 = Date.parse("2026-11-09T12:00:00.000Z"); // the seed check
const T1 = Date.parse("2026-11-09T12:10:00.000Z"); // the next check
const at = (ms: number) => {
  clock.now = () => ms;
};
// SOLAPI answers a list as an object keyed by id.
const keyed = (items: Array<{ groupId: string }>, nextKey?: string): MockResponse => ({
  body: {
    groupList: Object.fromEntries(items.map((i) => [i.groupId, i])),
    ...(nextKey ? { nextKey } : {}),
  },
});
const grp = (n: number, stamp = "2026-11-09T12:05:00.000Z", created = stamp) => ({
  groupId: `g${n}`,
  dateCreated: created,
  dateUpdated: stamp,
});
const range = (from: number, to: number, stamp?: string) =>
  Array.from({ length: to - from + 1 }, (_, i) => grp(from + i, stamp));
const ids = (events: unknown[]) => events.map((e) => (e as { groupId: string }).groupId).sort();

for (const [t, dateType] of [[newGroup, "CREATED"], [newOrUpdatedGroup, "UPDATED"]] as const) {
  const seedState = async () => {
    at(T0);
    const seed = mockCtx([]);
    const seeded = await t.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 0);
    return seeded.nextState;
  };
  const URL0 = `${B}/messages/v4/groups?startDate=2026-11-09T12%3A00%3A00.000Z` +
    `&endDate=2026-11-09T12%3A10%3A00.000Z&dateType=${dateType}&limit=100`;

  test(`${t.key}: seeds without a request, emits the new group, retries identically, literal request`, async () => {
    const state = await seedState();
    at(T1);
    const m = mockCtx([keyed([grp(7)])]);
    const first = await t.poll!({ ...input, state }, m.ctx);
    const retry = await t.poll!({ ...input, state }, mockCtx([keyed([grp(7)])]).ctx);
    assertEquals(ids(first.events), ["g7"]);
    assertEquals(retry, first);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(m.calls[0].url, URL0);
  });

  test(`${t.key}: drains 2 full pages across checks via nextKey, each group once, cursor after`, async () => {
    const state = await seedState();
    at(T1);
    const r1 = await t.poll!({ ...input, state }, mockCtx([keyed(range(1, 100), "k2")]).ctx);
    assertEquals(r1.events.length, 100);
    const s1 = r1.nextState as { cursor: number; resume?: { pos: string } };
    assertEquals(s1.cursor, T0);
    assertEquals(s1.resume?.pos, "k2");
    at(T1 + 300_000);
    const c2 = mockCtx([keyed(range(101, 200))]);
    const r2 = await t.poll!({ ...input, state: r1.nextState }, c2.ctx);
    assertEquals(r2.events.length, 100);
    assertEquals(c2.calls[0].url, `${URL0}&startKey=k2`);
    assertEquals((r2.nextState as { cursor: number }).cursor, T1);
    assertEquals((r2.nextState as { resume?: unknown }).resume, undefined);
    assertEquals(new Set(ids([...r1.events, ...r2.events])).size, 200);
  });

  test(`${t.key}: groups that predate the seed never fire, however many pages they fill`, async () => {
    const state = await seedState();
    const old = "2026-11-09T11:59:00.000Z";
    at(T1);
    const r1 = await t.poll!({ ...input, state }, mockCtx([keyed(range(1, 100, old), "k2")]).ctx);
    assertEquals(r1.events, []);
    at(T1 + 300_000);
    const r2 = await t.poll!(
      { ...input, state: r1.nextState },
      mockCtx([keyed(range(101, 200, old), "k3")]).ctx,
    );
    assertEquals(r2.events, []);
    at(T1 + 600_000);
    const r3 = await t.poll!(
      { ...input, state: r2.nextState },
      mockCtx([keyed([...range(201, 250, old), grp(999, "2026-11-09T12:08:00.000Z")])]).ctx,
    );
    assertEquals(ids(r3.events), ["g999"]);
  });
}

test("new-or-updated-group: an edit to an OLD group is an event; new-group ignores it", async () => {
  at(T0);
  const sU = (await newOrUpdatedGroup.poll!({ ...input, state: {} }, mockCtx([]).ctx)).nextState;
  const sN = (await newGroup.poll!({ ...input, state: {} }, mockCtx([]).ctx)).nextState;
  at(T1);
  // created before the seed, updated after it: the CREATED window does not hold it
  const edited = grp(5, "2026-11-09T12:06:00.000Z", "2026-11-08T08:00:00.000Z");
  const u = await newOrUpdatedGroup.poll!({ ...input, state: sU }, mockCtx([keyed([edited])]).ctx);
  assertEquals(u.events, [edited]);
  const n = await newGroup.poll!({ ...input, state: sN }, mockCtx([keyed([])]).ctx);
  assertEquals(n.events, []);
});

interface Case {
  trigger: TriggerDefinition;
  url: string;
  url2?: string;
  respond(rows: unknown[], nextKey?: string): MockResponse;
  row(n: number): Record<string, unknown>;
}
const CASES: Case[] = [
  {
    trigger: newSenderNumber,
    url: `${B}/senderid/v1/numbers`,
    respond: (rows) => ({ body: { accountId: "acct-1", limit: 10, senderIds: rows } }),
    row: (n) => ({ handleKey: `h${n}`, phoneNumber: `0100000000${n}`, status: "ACTIVE" }),
  },
  {
    trigger: newKakaoChannel,
    url: `${B}/kakao/v2/channels?limit=100`,
    url2: `${B}/kakao/v2/channels?limit=100&startKey=k1`,
    respond: (rows, nextKey) => ({ body: { channelList: rows, ...(nextKey ? { nextKey } : {}) } }),
    row: (n) => ({ channelId: `c${n}`, searchId: `@c${n}` }),
  },
  {
    trigger: newKakaoTemplate,
    url: `${B}/kakao/v2/templates/?limit=100`,
    url2: `${B}/kakao/v2/templates/?limit=100&startKey=k1`,
    respond: (rows, nextKey) => ({ body: { templateList: rows, ...(nextKey ? { nextKey } : {}) } }),
    row: (n) => ({ templateId: `t${n}`, name: `template ${n}`, status: "APPROVED" }),
  },
];

for (const c of CASES) {
  const key = c.trigger.key;
  const run = (state: unknown, rs: MockResponse[]) => {
    const m = mockCtx(rs);
    return c.trigger.poll!({ ...input, state }, m.ctx).then((r) => ({ ...r, calls: m.calls }));
  };
  test(`${key}: seeds without flooding, sends the literal request, emits only the added row`, async () => {
    const seeded = await run({}, [c.respond([c.row(1)])]);
    assertEquals(seeded.events, []);
    assertEquals(seeded.calls[0].method, "GET");
    assertEquals(seeded.calls[0].url, c.url);
    const first = await run(seeded.nextState, [c.respond([c.row(1), c.row(2)])]);
    const retry = await run(seeded.nextState, [c.respond([c.row(1), c.row(2)])]);
    assertEquals(first.events, [c.row(2)]);
    assertEquals(retry, first);
    const edited = await run(seeded.nextState, [c.respond([{ ...c.row(1), name: "renamed" }])]);
    assertEquals(edited.events, []);
  });
  if (c.url2) {
    test(`${key}: follows nextKey and refuses more than 1000 rows`, async () => {
      const seeded = await run({}, [c.respond([c.row(1)], "k1"), c.respond([c.row(2)])]);
      assertEquals(seeded.calls[1].url, c.url2!);
      const next = await run(seeded.nextState, [
        c.respond([c.row(1)], "k1"),
        c.respond([c.row(2), c.row(3)]),
      ]);
      assertEquals(next.events, [c.row(3)]);
      const rows = Array.from({ length: 100 }, (_, i) => c.row(i + 1));
      await assertRejects(() => run({}, Array.from({ length: 10 }, () => c.respond(rows, "k1"))));
    });
  }
}
