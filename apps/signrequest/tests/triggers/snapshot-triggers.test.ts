import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newTemplate from "../../triggers/new-template.ts";
import newTeamMember from "../../triggers/new-team-member.ts";
import newTeam from "../../triggers/new-team.ts";

const BASE = "https://signrequest.com/api/v1";
const CASES = [
  { trigger: newTemplate, path: "/templates/", id: "uuid" },
  { trigger: newTeamMember, path: "/team-members/", id: "uuid" },
  { trigger: newTeam, path: "/teams/", id: "subdomain" },
];
const input = { params: {}, subscriptionId: "sub-1" };

for (const c of CASES) {
  const rec = (n: string) => ({ [c.id]: n, name: `name-${n}` });
  const page = (results: unknown[], next: string | null = null) => ({
    count: results.length,
    next,
    previous: null,
    results,
  });

  test(`${c.trigger.key}: seeds, emits a new record, retries idempotently, requests the literal page`, async () => {
    const seed = mockCtx([{ body: page([rec("a")]) }]);
    const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

    const run = mockCtx([{ body: page([rec("b"), rec("a")]) }]);
    const first = await c.trigger.poll!({ ...input, state: seeded.nextState }, run.ctx);
    const retry = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page([rec("b"), rec("a")]) }]).ctx,
    );
    assertEquals(first.events, [rec("b")]);
    assertEquals(retry, first);
    assertEquals(run.calls.length, 1);
    assertEquals(run.calls[0].method, "GET");
    assertEquals(run.calls[0].url, `${BASE}${c.path}?page=1&limit=100`);
    const again = await c.trigger.poll!(
      { ...input, state: first.nextState },
      mockCtx([{ body: page([rec("b"), rec("a")]) }]).ctx,
    );
    assertEquals(again.events, []);
  });

  test(`${c.trigger.key}: reads every page until next is empty`, async () => {
    const seeded = await c.trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ body: page([]) }]).ctx,
    );
    const run = mockCtx([
      { body: page([rec("a")], `${BASE}${c.path}?page=2&limit=100`) },
      { body: page([rec("b")]) },
    ]);
    const r = await c.trigger.poll!({ ...input, state: seeded.nextState }, run.ctx);
    assertEquals(r.events, [rec("a"), rec("b")]);
    assertEquals(run.calls.map((x) => x.url), [
      `${BASE}${c.path}?page=1&limit=100`,
      `${BASE}${c.path}?page=2&limit=100`,
    ]);
  });
}
