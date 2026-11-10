import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newMessage from "../../triggers/new-message.ts";
import newSequence from "../../triggers/new-sequence.ts";
import newSequenceFolder from "../../triggers/new-sequence-folder.ts";
import newTeam from "../../triggers/new-team.ts";
import newTeamMember from "../../triggers/new-team-member.ts";
import newTemplate from "../../triggers/new-template.ts";

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
    url: `${V1}/sequences`,
    fresh: ["a", "b"],
    expect: ["b"],
  },
  {
    name: "new-sequence (folder)",
    t: newSequence,
    params: { folder: "f1" },
    url: `${V1}/sequences?folder=f1`,
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
    url: `${V1}/teams`,
    fresh: ["a", "b"],
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
    url: `${V1}/snippets`,
    fresh: ["a", "b"],
    expect: ["b"],
  },
];

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
    await poll(newTeam, {}, {}, mockCtx([{ body: { results: [{ name: "x" }] } }]).ctx);
  } catch (e) {
    err = (e as Error).message;
  }
  assertEquals(err.includes("without an _id"), true);
});
