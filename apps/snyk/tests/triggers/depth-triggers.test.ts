import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newGroupIssue from "../../triggers/new-group-issue.ts";
import newOrUpdatedGroupIssue from "../../triggers/new-or-updated-group-issue.ts";
import newTarget from "../../triggers/new-target.ts";
import newOrganization from "../../triggers/new-organization.ts";
import newGroup from "../../triggers/new-group.ts";
import newCollection from "../../triggers/new-collection.ts";
import newCollectionProject from "../../triggers/new-collection-project.ts";
import { clock } from "../../lib/triggers.ts";

const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const T1 = T0 + 300_000;
const V = "version=2026-03-25";
const SINCE = "2026-11-09T11%3A58%3A00.000Z"; // T0 - 120 s
const NEW_AT = "2026-11-09T12:03:00.000Z";
const PRE_AT = "2026-11-09T11:59:30.000Z";
const wrap = (data: unknown[], nextPath?: string) => ({
  data,
  links: nextPath ? { next: nextPath } : {},
});
const next = (r: unknown) => (r as { nextState: unknown }).nextState;
const events = (r: unknown) => (r as { events: unknown[] }).events;

// ---- since-filter triggers -------------------------------------------------------------------
const WINDOWS = [
  {
    t: newGroupIssue,
    params: { groupId: "grp-1" },
    base: "/rest/groups/grp-1/issues",
    query: `${V}&created_after=${SINCE}&limit=100`,
    rec: (id: string, at: string) => ({
      id,
      type: "issue",
      attributes: { created_at: at, updated_at: at },
    }),
  },
  {
    t: newOrUpdatedGroupIssue,
    params: { groupId: "grp-1" },
    base: "/rest/groups/grp-1/issues",
    query: `${V}&updated_after=${SINCE}&limit=100`,
    rec: (id: string, at: string) => ({
      id,
      type: "issue",
      attributes: { created_at: PRE_AT, updated_at: at },
    }),
  },
  {
    t: newTarget,
    params: { orgId: "org-1" },
    base: "/rest/orgs/org-1/targets",
    query: `${V}&created_gte=${SINCE}&limit=100`,
    rec: (id: string, at: string) => ({
      id,
      type: "target",
      attributes: { created_at: at, display_name: id },
    }),
  },
];

for (const w of WINDOWS) {
  const key = w.t.key;
  const input = { params: w.params, subscriptionId: "sub-1" };
  const seed = async () => {
    clock.now = () => T0;
    const c = mockCtx([]);
    const r = await w.t.poll!({ ...input, state: {} } as never, c.ctx);
    return { r, calls: c.calls };
  };

  test(`${key}: seeds with no request, emits a new record, retries identically, requests the literal window`, async () => {
    const { r: seeded, calls } = await seed();
    assertEquals(events(seeded), []);
    assertEquals((next(seeded) as { seeded?: boolean }).seeded, true);
    assertEquals(calls.length, 0);
    clock.now = () => T1;
    const fresh = w.rec("fresh", NEW_AT);
    const run = mockCtx([{ body: wrap([fresh]) }]);
    const first = await w.t.poll!({ ...input, state: next(seeded) } as never, run.ctx);
    const retry = await w.t.poll!(
      { ...input, state: next(seeded) } as never,
      mockCtx([{ body: wrap([fresh]) }]).ctx,
    );
    assertEquals(events(first), [fresh]);
    assertEquals(retry, first);
    assertEquals(run.calls[0].method, "GET");
    assertEquals(run.calls[0].url, `https://api.snyk.io${w.base}?${w.query}`);
    assertEquals((next(first) as { cursor: number }).cursor, T1);
  });

  test(`${key}: a multi-page window is drained in one check, each record once`, async () => {
    const { r: seeded } = await seed();
    clock.now = () => T1;
    const mk = (p: number) => Array.from({ length: 100 }, (_, i) => w.rec(`r${p}-${i}`, NEW_AT));
    const c = mockCtx([
      { body: wrap(mk(0), `${w.base}?limit=100&starting_after=c0`) },
      { body: wrap(mk(1), `${w.base}?limit=100&starting_after=c1`) },
      { body: wrap(mk(2), `${w.base}?limit=100&starting_after=c2`) },
      { body: wrap(mk(3)) },
    ]);
    const r = await w.t.poll!({ ...input, state: next(seeded) } as never, c.ctx);
    assertEquals(events(r).length, 400);
    assertEquals(new Set(events(r).map((e) => (e as { id: string }).id)).size, 400);
    assertEquals(c.calls.length, 4);
    assertEquals((next(r) as { resume?: unknown }).resume, undefined);
  });

  test(`${key}: records from before the seed never flood a later check; one after it is emitted`, async () => {
    const { r: seeded } = await seed();
    const pre = [0, 1, 2, 3].map((p) =>
      Array.from({ length: 100 }, (_, i) => w.rec(`pre${p}-${i}`, PRE_AT))
    );
    let state = next(seeded);
    let now = T1;
    for (let check = 0; check < 3; check++) {
      clock.now = () => now;
      const r = await w.t.poll!(
        { ...input, state } as never,
        mockCtx(pre.map((c, i) => ({
          body: wrap(c, i < 3 ? `${w.base}?limit=100&starting_after=c${i}` : undefined),
        }))).ctx,
      );
      assertEquals(events(r), []);
      state = next(r);
      now += 300_000;
    }
    clock.now = () => now;
    const post = w.rec("post-1", "2026-11-09T12:20:00.000Z");
    const r = await w.t.poll!(
      { ...input, state } as never,
      mockCtx([{ body: wrap([post]) }]).ctx,
    );
    assertEquals(events(r), [post]);
  });
}

test("new-or-updated-group-issue: an edited issue is a new event", async () => {
  const input = { params: { groupId: "grp-1" }, subscriptionId: "sub-1" };
  clock.now = () => T0;
  const seeded = await newOrUpdatedGroupIssue.poll!(
    { ...input, state: {} } as never,
    mockCtx([]).ctx,
  );
  const rec = (u: string) => ({
    id: "i1",
    type: "issue",
    attributes: { created_at: PRE_AT, updated_at: u },
  });
  clock.now = () => T1;
  const a = await newOrUpdatedGroupIssue.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([{ body: wrap([rec("2026-11-09T12:01:00.000Z")]) }]).ctx,
  );
  assertEquals(events(a).length, 1);
  clock.now = () => T1 + 300_000;
  const same = await newOrUpdatedGroupIssue.poll!(
    { ...input, state: next(a) } as never,
    mockCtx([{ body: wrap([rec("2026-11-09T12:01:00.000Z")]) }]).ctx,
  );
  assertEquals(events(same), []);
  clock.now = () => T1 + 600_000;
  const edited = await newOrUpdatedGroupIssue.poll!(
    { ...input, state: next(same) } as never,
    mockCtx([{ body: wrap([rec("2026-11-09T12:09:00.000Z")]) }]).ctx,
  );
  assertEquals(events(edited).length, 1);
});

// ---- bounded snapshots -----------------------------------------------------------------------
const SNAPSHOTS = [
  { t: newOrganization, params: {}, url: `https://api.snyk.io/rest/orgs?${V}&limit=100` },
  { t: newGroup, params: {}, url: `https://api.snyk.io/rest/groups?${V}&limit=100` },
  {
    t: newCollection,
    params: { orgId: "org-1" },
    url: `https://api.snyk.io/rest/orgs/org-1/collections?${V}&limit=100`,
  },
  {
    t: newCollectionProject,
    params: { orgId: "org-1", collectionId: "col-1" },
    url:
      `https://api.snyk.io/rest/orgs/org-1/collections/col-1/relationships/projects?${V}&limit=100`,
  },
];

for (const s of SNAPSHOTS) {
  const input = { params: s.params, subscriptionId: "sub-1" };
  const rec = (id: string) => ({ id, type: "x", attributes: { name: id } });
  test(`${s.t.key}: seeds, emits a new id, retries idempotently, requests the literal list`, async () => {
    const seeded = await s.t.poll!(
      { ...input, state: {} } as never,
      mockCtx([{ body: wrap([rec("a")]) }]).ctx,
    );
    assertEquals(events(seeded), []);
    assertEquals((next(seeded) as { seeded?: boolean }).seeded, true);
    const run = mockCtx([{ body: wrap([rec("b"), rec("a")]) }]);
    const first = await s.t.poll!({ ...input, state: next(seeded) } as never, run.ctx);
    const retry = await s.t.poll!(
      { ...input, state: next(seeded) } as never,
      mockCtx([{ body: wrap([rec("b"), rec("a")]) }]).ctx,
    );
    assertEquals(events(first), [rec("b")]);
    assertEquals(retry, first);
    assertEquals(run.calls[0].method, "GET");
    assertEquals(run.calls[0].url, s.url);
    const again = await s.t.poll!(
      { ...input, state: next(first) } as never,
      mockCtx([{ body: wrap([rec("b"), rec("a")]) }]).ctx,
    );
    assertEquals(events(again), []);
  });
}
