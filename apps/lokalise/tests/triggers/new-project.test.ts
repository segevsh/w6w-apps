import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import trigger from "../../triggers/new-project.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const project = (id: string, name: string) => ({
  project_id: id,
  name,
  project_type: "localization_files",
  created_at: "2026-11-10 10:30:00",
});
const keys = (r: { events: unknown[] }) => r.events.map((e) => (e as { key: string }).key);

test("new-project: first check seeds the snapshot without events; request is GET /projects?limit=5000", async () => {
  const c = mockCtx([{ body: { projects: [project("a", "A"), project("b", "B")] } }]);
  const r = await trigger.poll!({ ...input, state: {} }, c.ctx);
  assertEquals(r.events, []);
  assertEquals((r.nextState as { seeded: boolean }).seeded, true);
  assertEquals(c.calls.length, 1);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(pathOf(c.calls[0].url), "/api2/projects");
  assertEquals(queryOf(c.calls[0].url), { limit: "5000" });
});

test("new-project: a project added after the seed is emitted once; a retry is identical", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { projects: [project("a", "A")] } }]).ctx,
  );
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: { projects: [project("a", "A"), project("b", "B")] } }]).ctx,
    );
  const first = await run();
  assertEquals(keys(first), ["b"]);
  assertEquals((first.events[0] as { change: string }).change, "added");
  assertEquals((first.events[0] as { values: { name: string } }).values.name, "B");
  assertEquals(await run(), first);
  const again = await trigger.poll!(
    { ...input, state: first.nextState },
    mockCtx([{ body: { projects: [project("a", "A"), project("b", "B")] } }]).ctx,
  );
  assertEquals(again.events, []);
});

test("new-project: a renamed project is not a new one; a removed one emits nothing", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { projects: [project("a", "A"), project("b", "B")] } }]).ctx,
  );
  const r = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: { projects: [project("a", "A renamed")] } }]).ctx,
  );
  assertEquals(r.events, []);
});
