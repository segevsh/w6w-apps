import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, paginationHeaders } from "../_helpers.ts";
import newPerson from "../../triggers/new-person.ts";
import newOrUpdatedPerson from "../../triggers/new-or-updated-person.ts";
import newProject from "../../triggers/new-project.ts";
import newOrUpdatedProject from "../../triggers/new-or-updated-project.ts";
import newLoggedTime from "../../triggers/new-logged-time.ts";
import newOrUpdatedLoggedTime from "../../triggers/new-or-updated-logged-time.ts";
import newTimeoff from "../../triggers/new-timeoff.ts";
import newOrUpdatedTimeoff from "../../triggers/new-or-updated-timeoff.ts";
import newClient from "../../triggers/new-client.ts";
import newMilestone from "../../triggers/new-milestone.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const API = "https://api.float.com/v3";
const body = (rows: unknown[]) => ({ body: rows });

// Newest-first triggers: a literal request with the sort argument, ids as the vendor names them.
const sorted = [
  {
    name: "new-person",
    trigger: newPerson,
    idKey: "people_id",
    stamp: false,
    url: `${API}/people?page=1&per-page=100&sort=-created`,
  },
  {
    name: "new-or-updated-person",
    trigger: newOrUpdatedPerson,
    idKey: "people_id",
    stamp: true,
    url: `${API}/people?page=1&per-page=100&sort=-modified`,
  },
  {
    name: "new-project",
    trigger: newProject,
    idKey: "project_id",
    stamp: false,
    url: `${API}/projects?page=1&per-page=100&sort=-created`,
  },
  {
    name: "new-or-updated-project",
    trigger: newOrUpdatedProject,
    idKey: "project_id",
    stamp: true,
    url: `${API}/projects?page=1&per-page=100&sort=-modified`,
  },
  {
    name: "new-logged-time",
    trigger: newLoggedTime,
    idKey: "logged_time_id",
    stamp: false,
    url: `${API}/logged-time?page=1&per-page=100&sort=-created`,
  },
  {
    name: "new-or-updated-logged-time",
    trigger: newOrUpdatedLoggedTime,
    idKey: "logged_time_id",
    stamp: true,
    url: `${API}/logged-time?page=1&per-page=100&sort=-modified`,
  },
  {
    name: "new-timeoff",
    trigger: newTimeoff,
    idKey: "timeoff_id",
    stamp: false,
    url: `${API}/timeoffs?page=1&per-page=100&sort=-created`,
  },
  {
    name: "new-or-updated-timeoff",
    trigger: newOrUpdatedTimeoff,
    idKey: "timeoff_id",
    stamp: true,
    url: `${API}/timeoffs?page=1&per-page=100&sort=-modified`,
  },
];
for (const c of sorted) {
  describe(c.name, () => {
    const row = (id: string, modified = "2026-11-09 10:00:00") => ({ [c.idKey]: id, modified });
    test("seeds without emitting, then emits only the new rows, idempotently", async () => {
      const seeded = await c.trigger.poll!(
        { ...input, state: {} },
        mockCtx([body([row("b"), row("a")])]).ctx,
      );
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      const page = [row("d"), row("c"), row("b"), row("a")];
      const first = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([body(page)]).ctx,
      );
      const retry = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([body(page)]).ctx,
      );
      assertEquals(first.events, [row("c"), row("d")]);
      assertEquals(retry, first);
    });
    test("requests the wrapped list action with the literal sort argument", async () => {
      const seed = mockCtx([body([row("a")])]);
      await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seed.calls.length, 1);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, c.url);
    });
    if (c.stamp) {
      test("an edited record (new modified stamp) is a new event", async () => {
        const seeded = await c.trigger.poll!(
          { ...input, state: {} },
          mockCtx([body([row("a", "2026-11-09 10:00:00")])]).ctx,
        );
        const edited = await c.trigger.poll!(
          { ...input, state: seeded.nextState },
          mockCtx([body([row("a", "2026-11-09 11:00:00")])]).ctx,
        );
        assertEquals(edited.events, [row("a", "2026-11-09 11:00:00")]);
      });
    }
  });
}

const snaps = [
  { name: "new-client", trigger: newClient, idKey: "client_id", path: "clients" },
  { name: "new-milestone", trigger: newMilestone, idKey: "milestone_id", path: "milestones" },
];
for (const c of snaps) {
  describe(c.name, () => {
    const row = (id: number) => ({ [c.idKey]: id, name: `Record ${id}` });
    test("seeds without emitting, then emits only the new rows, idempotently", async () => {
      const seeded = await c.trigger.poll!(
        { ...input, state: {} },
        mockCtx([{ body: [row(1), row(2)], headers: paginationHeaders() }]).ctx,
      );
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      const next = () =>
        mockCtx([{ body: [row(1), row(2), row(3)], headers: paginationHeaders() }]).ctx;
      const first = await c.trigger.poll!({ ...input, state: seeded.nextState }, next());
      const retry = await c.trigger.poll!({ ...input, state: seeded.nextState }, next());
      assertEquals(first.events, [row(3)]);
      assertEquals(retry, first);
    });
    test("sends the literal request and follows every page", async () => {
      const m = mockCtx([
        { body: [row(1)], headers: paginationHeaders({ "x-pagination-page-count": "2" }) },
        { body: [row(2)], headers: paginationHeaders({ "x-pagination-page-count": "2" }) },
      ]);
      const out = await c.trigger.poll!({ ...input, state: {} }, m.ctx);
      assertEquals(out.events, []);
      assertEquals(m.calls.length, 2);
      assertEquals(m.calls[0].method, "GET");
      assertEquals(m.calls[0].url, `${API}/${c.path}?page=1&per-page=200`);
      assertEquals(m.calls[1].url, `${API}/${c.path}?page=2&per-page=200`);
    });
    test("a collection beyond 25 pages fails instead of a partial snapshot", async () => {
      const m = mockCtx(Array.from({ length: 26 }, (_, i) => ({
        body: [row(i + 1)],
        headers: paginationHeaders({ "x-pagination-page-count": "99" }),
      })));
      await assertRejects(() => c.trigger.poll!({ ...input, state: {} }, m.ctx), Error, "25 pages");
    });
  });
}
