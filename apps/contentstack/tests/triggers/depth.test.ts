import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newRelease from "../../triggers/new-release.ts";
import newBranch from "../../triggers/new-branch.ts";

// deno-lint-ignore no-explicit-any
type Trigger = any;
const seeded = (s: { nextState: unknown }) => (s.nextState as { seeded?: boolean }).seeded;

interface Case {
  name: string;
  trigger: Trigger;
  listKey: string;
  /** The literal request the first (seeding) check sends. */
  url: string;
}

const cases: Case[] = [
  {
    name: "new-release",
    trigger: newRelease,
    listKey: "releases",
    url: "https://api.contentstack.io/v3/releases?limit=100&skip=0",
  },
  {
    name: "new-branch",
    trigger: newBranch,
    listKey: "branches",
    url: "https://api.contentstack.io/v3/stacks/branches?limit=100&skip=0",
  },
];

for (const c of cases) {
  const row = (uid: string) => ({ uid, name: `row ${uid}` });
  const respond = (...uids: string[]) => mockCtx([{ body: { [c.listKey]: uids.map(row) } }]);
  const input = { params: {}, subscriptionId: "sub-1" };

  test(`${c.name}: seeds without flooding and sends the documented request`, async () => {
    const seed = respond("a", "b");
    const result = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(result.events, []);
    assertEquals(seeded(result), true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);
  });

  test(`${c.name}: emits only the new row and retries idempotently`, async () => {
    const seed = await c.trigger.poll!({ ...input, state: {} }, respond("a", "b").ctx);
    const first = await c.trigger.poll!(
      { ...input, state: seed.nextState },
      respond("c", "b", "a").ctx,
    );
    const retry = await c.trigger.poll!(
      { ...input, state: seed.nextState },
      respond("c", "b", "a").ctx,
    );
    assertEquals(first.events, [row("c")]);
    assertEquals(retry, first);
  });
}

test("new-release: a full page makes the walk request the next skip", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ uid: `r${i}` }));
  const run = mockCtx([{ body: { releases: full } }, { body: { releases: [{ uid: "last" }] } }]);
  await newRelease.poll!({ params: {}, subscriptionId: "sub-1", state: {} }, run.ctx);
  assertEquals(run.calls.map((c) => c.url), [
    "https://api.contentstack.io/v3/releases?limit=100&skip=0",
    "https://api.contentstack.io/v3/releases?limit=100&skip=100",
  ]);
});
