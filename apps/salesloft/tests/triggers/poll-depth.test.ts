import assert from "node:assert/strict";
import { test } from "node:test";
import newAccount from "../../triggers/new-account.ts";
import newOrUpdatedAccount from "../../triggers/new-or-updated-account.ts";
import newCadence from "../../triggers/new-cadence.ts";
import newOrUpdatedCadence from "../../triggers/new-or-updated-cadence.ts";
import newCadenceMembership from "../../triggers/new-cadence-membership.ts";
import newOrUpdatedCadenceMembership from "../../triggers/new-or-updated-cadence-membership.ts";
import newCall from "../../triggers/new-call.ts";
import newOrUpdatedCall from "../../triggers/new-or-updated-call.ts";
import newNote from "../../triggers/new-note.ts";
import newOrUpdatedNote from "../../triggers/new-or-updated-note.ts";
import newOrUpdatedTask from "../../triggers/new-or-updated-task.ts";
import newUser from "../../triggers/new-user.ts";
import { mockCtx } from "../_helpers.ts";

// One case set per poll trigger. `path` and `sort` are LITERALS; nothing here is computed by the
// code under test. Stamped triggers (new-or-updated-*) key events on `id:updated_at`.
const feeds = [
  {
    name: "new-account",
    trigger: newAccount,
    path: "/v2/accounts",
    sort: "created_at",
    stamped: false,
  },
  {
    name: "new-or-updated-account",
    trigger: newOrUpdatedAccount,
    path: "/v2/accounts",
    sort: "updated_at",
    stamped: true,
  },
  {
    name: "new-cadence",
    trigger: newCadence,
    path: "/v2/cadences",
    sort: "created_at",
    stamped: false,
  },
  {
    name: "new-or-updated-cadence",
    trigger: newOrUpdatedCadence,
    path: "/v2/cadences",
    sort: "updated_at",
    stamped: true,
  },
  {
    name: "new-cadence-membership",
    trigger: newCadenceMembership,
    path: "/v2/cadence_memberships",
    sort: "added_at",
    stamped: false,
  },
  {
    name: "new-or-updated-cadence-membership",
    trigger: newOrUpdatedCadenceMembership,
    path: "/v2/cadence_memberships",
    sort: "updated_at",
    stamped: true,
  },
  {
    name: "new-call",
    trigger: newCall,
    path: "/v2/activities/calls",
    sort: "created_at",
    stamped: false,
  },
  {
    name: "new-or-updated-call",
    trigger: newOrUpdatedCall,
    path: "/v2/activities/calls",
    sort: "updated_at",
    stamped: true,
  },
  {
    name: "new-note",
    trigger: newNote,
    path: "/v2/notes",
    sort: "created_at",
    stamped: false,
  },
  {
    name: "new-or-updated-note",
    trigger: newOrUpdatedNote,
    path: "/v2/notes",
    sort: "updated_at",
    stamped: true,
  },
  {
    name: "new-or-updated-task",
    trigger: newOrUpdatedTask,
    path: "/v2/tasks",
    sort: "updated_at",
    stamped: true,
  },
  {
    name: "new-user",
    trigger: newUser,
    path: "/v2/users",
    sort: "id",
    stamped: false,
  },
];

const rec = (id: number, updatedAt: string) => ({ id, updated_at: updatedAt });

for (const f of feeds) {
  test(`${f.name} seeds, emits only the new record, retries identically, requests ${f.sort} DESC`, async () => {
    const call = async (state: unknown, data: unknown[]) => {
      const m = mockCtx([{ body: { data } }]);
      const r = await f.trigger.poll!({ params: {}, state, subscriptionId: "s" }, m.ctx);
      const url = new URL(m.calls[0].url);
      return {
        r,
        req: {
          method: m.calls[0].method,
          path: url.pathname,
          query: Object.fromEntries(url.searchParams),
        },
      };
    };
    const expectedReq = {
      method: "GET",
      path: f.path,
      query: { sort_by: f.sort, sort_direction: "DESC", page: "1", per_page: "100" },
    };
    const seed = await call({}, [rec(1, "2026-11-10T09:00:00Z")]);
    assert.deepEqual(seed.r.events, []);
    assert.equal((seed.r.nextState as { seeded?: boolean }).seeded, true);
    assert.deepEqual(seed.req, expectedReq);

    const fresh = rec(2, "2026-11-10T09:05:00Z");
    const page = [fresh, rec(1, "2026-11-10T09:00:00Z")];
    const first = await call(seed.r.nextState, page);
    const retry = await call(seed.r.nextState, page);
    assert.deepEqual(first.r.events, [fresh]);
    assert.deepEqual(retry.r, first.r);
    assert.deepEqual(first.req, expectedReq);
    assert.deepEqual((await call(first.r.nextState, page)).r.events, []);
  });

  if (f.stamped) {
    test(`${f.name} emits an EDITED record (same id, newer updated_at) once`, async () => {
      const m1 = mockCtx([{ body: { data: [rec(7, "2026-11-10T09:00:00Z")] } }]);
      const seed = await f.trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, m1.ctx);
      const edited = rec(7, "2026-11-10T09:30:00Z");
      const m2 = mockCtx([{ body: { data: [edited] } }]);
      const out = await f.trigger.poll!(
        { params: {}, state: seed.nextState, subscriptionId: "s" },
        m2.ctx,
      );
      assert.deepEqual(out.events, [edited]);
    });
  }
}
