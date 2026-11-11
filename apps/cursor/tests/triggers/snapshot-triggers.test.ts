import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newGroup from "../../triggers/new-group.ts";
import newRepoBlocklist from "../../triggers/new-repo-blocklist.ts";

// One row per snapshot trigger: the LITERAL request each check must make, a before/after pair of
// vendor bodies, and the one record the second check must emit.
const cases = [
  {
    trigger: newGroup,
    method: "GET",
    path: "/teams/groups",
    before: { groups: [{ id: "group_a", name: "A" }], unassignedGroup: { id: "unassigned" } },
    after: {
      groups: [{ id: "group_a", name: "A" }, { id: "group_b", name: "B" }],
      unassignedGroup: { id: "unassigned" },
    },
    emitted: [{ id: "group_b", name: "B" }],
  },
  {
    trigger: newRepoBlocklist,
    method: "GET",
    path: "/settings/repo-blocklists/repos",
    before: { repos: [{ id: "r1", url: "https://example.com/a", patterns: ["*"] }] },
    after: {
      repos: [
        { id: "r1", url: "https://example.com/a", patterns: ["*"] },
        { id: "r2", url: "https://example.com/b", patterns: ["x/**"] },
      ],
    },
    emitted: [{ id: "r2", url: "https://example.com/b", patterns: ["x/**"] }],
  },
];

for (const c of cases) {
  test(`${c.trigger.key} seeds, emits only the new record, retries identically, requests the list`, async () => {
    const t = c.trigger;
    const seeded = await t.poll!(
      { params: {}, state: {} },
      mockCtx([{ body: c.before }]).ctx,
    );
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const run = () => {
      const m = mockCtx([{ body: c.after }]);
      return { m, p: t.poll!({ params: {}, state: seeded.nextState }, m.ctx) };
    };
    const first = run();
    const out = await first.p;
    assertEquals(out.events, c.emitted);
    assertEquals(await run().p, out);
    const url = new URL(first.m.calls[0].url);
    assertEquals(
      { method: first.m.calls[0].method, path: url.pathname, query: url.search },
      { method: c.method, path: c.path, query: "" },
    );
  });
}

test("new-group ignores a group row without an id", async () => {
  const seeded = await newGroup.poll!(
    { params: {}, state: {} },
    mockCtx([{ body: { groups: [{ id: "g1" }] } }]).ctx,
  );
  const out = await newGroup.poll!(
    { params: {}, state: seeded.nextState },
    mockCtx([{ body: { groups: [{ id: "g1" }, { name: "no id" }] } }]).ctx,
  );
  assertEquals(out.events, []);
});
