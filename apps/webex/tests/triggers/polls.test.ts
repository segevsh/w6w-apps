import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import newRoom from "../../triggers/new-room.ts";
import newTeam from "../../triggers/new-team.ts";
import newTeamMember from "../../triggers/new-team-member.ts";

const room = (id: string, title = `Room ${id}`) => ({ id, title, type: "group", isLocked: false });
const team = (id: string) => ({ id, name: `Team ${id}` });
const member = (id: string) => ({ id, teamId: "T1", personId: `P-${id}`, isModerator: false });
const rows = (n: number, make: (id: string) => unknown) =>
  Array.from({ length: n }, (_, i) => make(`r${i}`));

const CASES = [
  {
    t: newRoom,
    make: (id: string) => room(id),
    edit: (id: string) => room(id, "Renamed"),
    params: {},
    url: "https://webexapis.com/v1/rooms?sortBy=id&max=1000",
    cap: 1000,
  },
  {
    t: newTeam,
    make: team,
    edit: (id: string) => ({ ...team(id), name: "Renamed" }),
    params: {},
    url: "https://webexapis.com/v1/teams?max=100",
    cap: 100,
  },
  {
    t: newTeamMember,
    make: member,
    edit: (id: string) => ({ ...member(id), isModerator: true }),
    params: { teamId: " T1 " },
    url: "https://webexapis.com/v1/team/memberships?teamId=T1&max=100",
    cap: 100,
  },
];

test("app: the three snapshot polls are declared, with output and sample and a poll", () => {
  for (const { t } of CASES) {
    assert.ok(app.triggers.some((x) => x.key === t.key), t.key);
    assert.equal(typeof t.poll, "function");
    assert.equal(t.onSubscribe, undefined);
    assert.ok(t.output.length > 0);
    assert.notEqual(t.sample, undefined);
  }
  assert.deepEqual(newTeamMember.params!.map((p) => [p.key, p.required]), [["teamId", true]]);
});

for (const { t, make, edit, params, url, cap } of CASES) {
  describe(t.key, () => {
    const input = (state: unknown) => ({ params, subscriptionId: "sub_1", state });
    const page = (...items: unknown[]) => ({ body: { items } });

    test("first check seeds and emits nothing; the request is the literal list call", async () => {
      const m = mockCtx([page(make("a"), make("b"))]);
      const r = await t.poll!(input({}), m.ctx);
      assert.deepEqual(r.events, []);
      assert.equal((r.nextState as { seeded?: boolean }).seeded, true);
      assert.deepEqual([m.calls[0].method, m.calls[0].url], ["GET", url]);
      assert.equal(m.calls.length, 1);
    });

    test("a record added after the seed is emitted exactly once; a retry is identical", async () => {
      const seeded = await t.poll!(input({}), mockCtx([page(make("a"))]).ctx);
      const run = () => t.poll!(input(seeded.nextState), mockCtx([page(make("a"), make("b"))]).ctx);
      const first = await run();
      assert.deepEqual(first.events, [make("b")]);
      assert.deepEqual(await run(), first);
      const again = await t.poll!(
        input(first.nextState),
        mockCtx([page(make("a"), make("b"))]).ctx,
      );
      assert.deepEqual(again.events, []);
    });

    test("an edited or removed record is not a new one", async () => {
      const seeded = await t.poll!(input({}), mockCtx([page(make("a"), make("b"))]).ctx);
      const r = await t.poll!(input(seeded.nextState), mockCtx([page(edit("a"))]).ctx);
      assert.deepEqual(r.events, []);
    });

    test(`a full page of ${cap} rows may be cut short: the check throws instead of guessing`, async () => {
      await assert.rejects(
        t.poll!(input({}), mockCtx([page(...rows(cap, make))]).ctx),
        new RegExp(`full page of ${cap}`),
      );
      // One below the cap is a complete collection.
      const ok = await t.poll!(input({}), mockCtx([page(...rows(cap - 1, make))]).ctx);
      assert.deepEqual(ok.events, []);
    });

    test("rows without an id are ignored; an empty answer seeds an empty snapshot", async () => {
      const r = await t.poll!(input({}), mockCtx([page({ title: "no id" }, null)]).ctx);
      assert.deepEqual(r.events, []);
      const empty = await t.poll!(input({}), mockCtx([{ body: {} }]).ctx);
      assert.equal((empty.nextState as { seeded?: boolean }).seeded, true);
    });
  });
}
