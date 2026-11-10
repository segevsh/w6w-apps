import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newMessage from "../../triggers/new-message.ts";
import newSequence from "../../triggers/new-sequence.ts";
import newSequenceFolder from "../../triggers/new-sequence-folder.ts";
import newTeam from "../../triggers/new-team.ts";
import newTeamMember from "../../triggers/new-team-member.ts";
import newTemplate from "../../triggers/new-template.ts";
import newSequenceRecipient from "../../triggers/new-sequence-recipient.ts";

const V1 = "https://api.mixmax.com/v1";
type Trig = {
  poll?: (i: never, c: never) => Promise<{ events: unknown[]; nextState: unknown }>;
};
const poll = (t: unknown, params: unknown, state: unknown, c: unknown) =>
  (t as Trig).poll!({ params, state, subscriptionId: "sub" } as never, c as never);
const seededOf = (r: { nextState: unknown }) => (r.nextState as { seeded?: boolean }).seeded;
const body = (...ids: string[]) => ({ body: { results: ids.map((_id) => ({ _id })) } });

const cases = [
  {
    name: "new-message",
    t: newMessage,
    params: {},
    url: `${V1}/messages?limit=100`,
    fresh: ["b", "a"],
    expect: ["b"],
  },
  {
    name: "new-sequence",
    t: newSequence,
    params: {},
    url: `${V1}/sequences?limit=100`,
    fresh: ["a", "b"],
    expect: ["b"],
  },
  {
    name: "new-sequence (folder)",
    t: newSequence,
    params: { folder: "f1" },
    url: `${V1}/sequences?folder=f1&limit=100`,
    fresh: ["a", "b"],
    expect: ["b"],
  },
  {
    name: "new-sequence-folder",
    t: newSequenceFolder,
    params: {},
    url: `${V1}/sequencefolders`,
    fresh: ["a", "b"],
    expect: ["b"],
  },
  {
    name: "new-team",
    t: newTeam,
    params: {},
    url: `${V1}/teams?limit=100`,
    fresh: ["b", "a"],
    expect: ["b"],
  },
  {
    name: "new-team-member",
    t: newTeamMember,
    params: { teamId: "t1" },
    url: `${V1}/teams/t1/members`,
    fresh: ["a", "b"],
    expect: ["b"],
  },
  {
    name: "new-template",
    t: newTemplate,
    params: {},
    url: `${V1}/snippets?sort=createdAt&sortAscending=false&limit=50`,
    fresh: ["b", "a"],
    expect: ["b"],
  },
];

const recipients = (...ids: string[]) => ({
  body: {
    sequences: { total: 0, results: [] },
    recipients: { total: ids.length, results: ids.map((_id) => ({ _id })) },
  },
});

for (
  const [name, params, url] of [
    ["all sequences", {}, `${V1}/sequences/search?limit=50&sortBy=createdAt&sortDesc=true`],
    [
      "one sequence",
      { sequenceId: "s1" },
      `${V1}/sequences/search?sequenceId=s1&limit=50&sortBy=createdAt&sortDesc=true`,
    ],
  ] as const
) {
  test(`new-sequence-recipient (${name}): seeds, emits the new recipient, requests the literal URL`, async () => {
    const seed = mockCtx([recipients("a")]);
    const seeded = await poll(newSequenceRecipient, params, {}, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seed.calls[0].url, url);
    const next = await poll(
      newSequenceRecipient,
      params,
      seeded.nextState,
      mockCtx([recipients("b", "a")]).ctx,
    );
    assertEquals(next.events, [{ _id: "b" }]);
  });
}

test("new-sequence follows the next cursor to the last page", async () => {
  const ctx = mockCtx([
    { body: { results: [{ _id: "a" }], next: "c1", hasNext: true } },
    { body: { results: [{ _id: "b" }], next: "c2", hasNext: false } },
  ]);
  const r = await poll(newSequence, {}, {}, ctx.ctx);
  assertEquals(ctx.calls.map((c) => c.url), [
    `${V1}/sequences?limit=100`,
    `${V1}/sequences?limit=100&next=c1`,
  ]);
  assertEquals(r.events, []);
  const again = mockCtx([
    { body: { results: [{ _id: "a" }], next: "c1", hasNext: true } },
    { body: { results: [{ _id: "b" }, { _id: "z" }], hasNext: false } },
  ]);
  assertEquals((await poll(newSequence, {}, r.nextState, again.ctx)).events, [{ _id: "z" }]);
});

test("new-sequence throws rather than snapshot a truncated list", async () => {
  const pages = Array.from({ length: 20 }, (_, i) => ({
    body: { results: [{ _id: `p${i}` }], next: `c${i}`, hasNext: true },
  }));
  let err = "";
  try {
    await poll(newSequence, {}, {}, mockCtx(pages).ctx);
  } catch (e) {
    err = (e as Error).message;
  }
  assertEquals(err.includes("more than 2000 records"), true);
});

for (const c of cases) {
  test(`${c.name}: seeds, emits only the new record, retries idempotently, requests the literal URL`, async () => {
    const seed = mockCtx([body("a")]);
    const seeded = await poll(c.t, c.params, {}, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seededOf(seeded), true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);
    const first = await poll(c.t, c.params, seeded.nextState, mockCtx([body(...c.fresh)]).ctx);
    const retry = await poll(c.t, c.params, seeded.nextState, mockCtx([body(...c.fresh)]).ctx);
    assertEquals(first.events, c.expect.map((_id) => ({ _id })));
    assertEquals(retry, first);
  });
}

test("snapshot triggers refuse a record without an _id", async () => {
  let err = "";
  try {
    await poll(newSequenceFolder, {}, {}, mockCtx([{ body: { results: [{ name: "x" }] } }]).ctx);
  } catch (e) {
    err = (e as Error).message;
  }
  assertEquals(err.includes("without an _id"), true);
});
