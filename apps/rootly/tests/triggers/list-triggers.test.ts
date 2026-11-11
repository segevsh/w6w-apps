import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mockCtx } from "../_helpers.ts";
import newService from "../../triggers/new-service.ts";
import newTeam from "../../triggers/new-team.ts";
import newUser from "../../triggers/new-user.ts";
import newOrUpdatedUser from "../../triggers/new-or-updated-user.ts";
import newFunctionality from "../../triggers/new-functionality.ts";
import newEnvironment from "../../triggers/new-environment.ts";
import newSeverity from "../../triggers/new-severity.ts";
import newSchedule from "../../triggers/new-schedule.ts";
import newIncidentEvent from "../../triggers/new-incident-event.ts";
import newIncidentActionItem from "../../triggers/new-incident-action-item.ts";

const doc = (ids: string[], type: string, next: number | null = null) => ({
  body: {
    data: ids.map((id) => ({ id, type, attributes: { name: `n-${id}` } })),
    meta: { current_page: 1, next_page: next },
  },
});
const rec = (id: string, type: string) => ({ id, type, name: `n-${id}` });
const req = (c: { method: string; url: string }) => {
  const u = new URL(c.url);
  return { method: c.method, path: u.pathname, query: Object.fromEntries(u.searchParams) };
};
const input = (params: Record<string, unknown>, state: unknown) => ({
  params,
  subscriptionId: "sub-1",
  state,
});

const NEWEST = [
  ["new-service", newService, "services", "/v1/services", "-created_at"],
  ["new-team", newTeam, "groups", "/v1/teams", "-created_at"],
  ["new-user", newUser, "users", "/v1/users", "-created_at"],
  ["new-functionality", newFunctionality, "functionalities", "/v1/functionalities", "-created_at"],
  ["new-environment", newEnvironment, "environments", "/v1/environments", "-created_at"],
  ["new-severity", newSeverity, "severities", "/v1/severities", "-created_at"],
  ["new-or-updated-user", newOrUpdatedUser, "users", "/v1/users", "-updated_at"],
] as const;

for (const [name, trigger, type, path, sort] of NEWEST) {
  describe(name, () => {
    test("seeds, emits only the new record, retries identically", async () => {
      const seeded = await trigger.poll!(input({}, {}), mockCtx([doc(["a", "b"], type)]).ctx);
      assert.deepEqual(seeded.events, []);
      assert.equal((seeded.nextState as { seeded?: boolean }).seeded, true);
      const page = () => mockCtx([doc(["c", "a", "b"], type)]);
      const out = await trigger.poll!(input({}, seeded.nextState), page().ctx);
      const retry = await trigger.poll!(input({}, seeded.nextState), page().ctx);
      assert.deepEqual(out.events, [rec("c", type)]);
      assert.deepEqual(retry, out);
    });

    test("sends the literal newest-first request", async () => {
      const m = mockCtx([doc(["a"], type)]);
      await trigger.poll!(input({}, {}), m.ctx);
      assert.deepEqual(req(m.calls[0]), {
        method: "GET",
        path,
        query: { sort, "page[number]": "1", "page[size]": "100" },
      });
    });
  });
}

describe("new-or-updated-user", () => {
  test("an edited user is a new event", async () => {
    const u = (stamp: string) => ({
      body: { data: [{ id: "u1", type: "users", attributes: { updated_at: stamp } }] },
    });
    const seeded = await newOrUpdatedUser.poll!(
      input({}, {}),
      mockCtx([u("2026-11-10T09:00:00Z")]).ctx,
    );
    const same = await newOrUpdatedUser.poll!(
      input({}, seeded.nextState),
      mockCtx([u("2026-11-10T09:00:00Z")]).ctx,
    );
    assert.deepEqual(same.events, []);
    const edited = await newOrUpdatedUser.poll!(
      input({}, seeded.nextState),
      mockCtx([u("2026-11-10T09:30:00Z")]).ctx,
    );
    assert.deepEqual(edited.events, [
      { id: "u1", type: "users", updated_at: "2026-11-10T09:30:00Z" },
    ]);
  });
});

const SNAPSHOTS = [
  ["new-schedule", newSchedule, {}, "schedules", "/v1/schedules"],
  [
    "new-incident-event",
    newIncidentEvent,
    { incident_id: "inc 1" },
    "incident_events",
    "/v1/incidents/inc%201/events",
  ],
  [
    "new-incident-action-item",
    newIncidentActionItem,
    { incident_id: "inc 1" },
    "incident_action_items",
    "/v1/incidents/inc%201/action_items",
  ],
] as const;

for (const [name, trigger, params, type, path] of SNAPSHOTS) {
  describe(name, () => {
    test("seeds, emits only the new record, retries identically", async () => {
      const seeded = await trigger.poll!(input(params, {}), mockCtx([doc(["a", "b"], type)]).ctx);
      assert.deepEqual(seeded.events, []);
      assert.equal((seeded.nextState as { seeded?: boolean }).seeded, true);
      const page = () => mockCtx([doc(["a", "b", "c"], type)]);
      const out = await trigger.poll!(input(params, seeded.nextState), page().ctx);
      const retry = await trigger.poll!(input(params, seeded.nextState), page().ctx);
      assert.deepEqual(out.events, [rec("c", type)]);
      assert.deepEqual(retry, out);
    });

    test("sends the literal list request and follows next_page", async () => {
      const m = mockCtx([doc(["a"], type, 2), doc(["b"], type)]);
      await trigger.poll!(input(params, {}), m.ctx);
      assert.deepEqual(m.calls.map(req), [
        { method: "GET", path, query: { "page[number]": "1", "page[size]": "100" } },
        { method: "GET", path, query: { "page[number]": "2", "page[size]": "100" } },
      ]);
    });
  });
}

test("a snapshot trigger refuses a collection beyond 50 pages", async () => {
  const pages = Array.from({ length: 51 }, (_, i) => doc([`p${i}`], "schedules", i + 2));
  await assert.rejects(() => newSchedule.poll!(input({}, {}), mockCtx(pages).ctx), /5000/);
});
