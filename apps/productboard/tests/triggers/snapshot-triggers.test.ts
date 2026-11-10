import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newTeam from "../../triggers/new-team.ts";
import newOrUpdatedTeam from "../../triggers/new-or-updated-team.ts";
import newMember from "../../triggers/new-member.ts";
import newTeamMember from "../../triggers/new-team-member.ts";
import newEntityRelationship from "../../triggers/new-entity-relationship.ts";
import newNoteRelationship from "../../triggers/new-note-relationship.ts";

// Snapshot triggers (brief 9.1c): each check reads every page of the wrapped list and diffs it.
const ROOT = "https://api.productboard.com/v2";
const envelope = (path: string, items: unknown[], tok?: string) => ({
  body: { data: items, links: { next: tok ? `${ROOT}${path}?pageCursor=${tok}` : null } },
});
const byId = (id: string, extra: Record<string, unknown> = {}) => ({ id, ...extra });
const rel = (type: string, target: string) => ({ type, target: { id: target, type: "feature" } });

const cases = [
  {
    trigger: newTeam,
    params: {},
    path: "/teams",
    method: "GET",
    mk: (n: number) => byId(`t${n}`, { fields: { name: `Team ${n}` } }),
  },
  {
    trigger: newOrUpdatedTeam,
    params: {},
    path: "/teams",
    method: "GET",
    mk: (n: number) => byId(`t${n}`, { fields: { name: `Team ${n}` } }),
  },
  {
    trigger: newMember,
    params: {},
    path: "/members",
    method: "GET",
    mk: (n: number) => byId(`m${n}`, { fields: { name: `Member ${n}` } }),
  },
  {
    trigger: newTeamMember,
    params: { teamId: "team-9" },
    path: "/teams/team-9/members",
    method: "GET",
    mk: (n: number) => byId(`m${n}`, { fields: { name: `Member ${n}` } }),
  },
  {
    trigger: newEntityRelationship,
    params: { entityId: "ent-9" },
    path: "/entities/ent-9/relationships",
    method: "GET",
    mk: (n: number) => rel("link", `f${n}`),
  },
  {
    trigger: newNoteRelationship,
    params: { noteId: "note-9" },
    path: "/notes/note-9/relationships",
    method: "GET",
    mk: (n: number) => rel("link", `f${n}`),
  },
] as const;

for (const { trigger, params, path, method, mk } of cases) {
  const name = trigger.key;
  const input = { params: params as Record<string, unknown>, subscriptionId: "sub-1" };

  test(`${name}: seed emits nothing and sends the documented request`, async () => {
    const c = mockCtx([envelope(path, [mk(1)])]);
    const r = await trigger.poll!({ ...input, state: {} }, c.ctx);
    assertEquals(r.events, []);
    assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(c.calls.length, 1);
    assertEquals(c.calls[0].method, method);
    assertEquals(c.calls[0].url, `${ROOT}${path}`);
  });

  test(`${name}: reads every page, emits only the new row, retry is idempotent`, async () => {
    const seeded = await trigger.poll!(
      { ...input, state: {} },
      mockCtx([envelope(path, [mk(1)], "next1"), envelope(path, [mk(2)])]).ctx,
    );
    const run = () => {
      const c = mockCtx([envelope(path, [mk(1), mk(3)], "next1"), envelope(path, [mk(2)])]);
      return trigger.poll!({ ...input, state: seeded.nextState }, c.ctx).then((r) => ({ r, c }));
    };
    const first = await run();
    assertEquals(first.r.events, [mk(3)]);
    assertEquals(first.c.calls.length, 2);
    assertEquals(first.c.calls[1].url, `${ROOT}${path}?pageCursor=next1`);
    assertEquals((await run()).r, first.r);
  });

  test(`${name}: refuses a collection past the page cap instead of looping`, async () => {
    const forever = Array.from(
      { length: 60 },
      (_, i) => envelope(path, [mk(i)], `t${i}`),
    );
    await assertRejects(() => trigger.poll!({ ...input, state: {} }, mockCtx(forever).ctx));
  });
}

test("new-team: an edited team is not an event; new-or-updated-team: it is", async () => {
  const v1 = byId("t1", { fields: { name: "Platform" }, updatedAt: "2026-11-10T09:00:00Z" });
  const v2 = byId("t1", { fields: { name: "Platform 2" }, updatedAt: "2026-11-10T10:00:00Z" });
  const input = { params: {}, subscriptionId: "sub-1" };
  for (const [trigger, expected] of [[newTeam, []], [newOrUpdatedTeam, [v2]]] as const) {
    const seeded = await trigger.poll!(
      { ...input, state: {} },
      mockCtx([envelope("/teams", [v1])]).ctx,
    );
    const r = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([envelope("/teams", [v2])]).ctx,
    );
    assertEquals(r.events, expected);
  }
});
