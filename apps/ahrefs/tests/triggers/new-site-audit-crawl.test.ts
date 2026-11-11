import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-site-audit-crawl.ts";

const input = { params: {}, subscriptionId: "s" };
const score = (id: string, date: string, health_score: number) => ({
  project_id: id,
  project_name: `site-${id}`,
  date,
  health_score,
  status: "Completed",
});
const ctx = (rows: unknown[]) => mockCtx([{ body: { healthscores: rows } }]);

test("new-site-audit-crawl: seeds without emitting", async () => {
  const m = ctx([score("1", "2026-11-01T00:00:00Z", 80)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-site-audit-crawl: a finished crawl is an updated event, a new project is added; idempotent", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    ctx([score("1", "2026-11-01T00:00:00Z", 80)]).ctx,
  );
  const rows = [score("1", "2026-11-08T00:00:00Z", 85), score("2", "2026-11-08T00:00:00Z", 70)];
  const run = () => trigger.poll!({ ...input, state: seeded.nextState }, ctx(rows).ctx);
  const first = await run();
  assertEquals(
    first.events.map((e) => {
      const ev = e as { change: string; key: string };
      return `${ev.change}:${ev.key}`;
    }),
    ["updated:1", "added:2"],
  );
  assertEquals(await run(), first);
});

test("new-site-audit-crawl: an unchanged row emits nothing", async () => {
  const rows = [score("1", "2026-11-01T00:00:00Z", 80)];
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx(rows).ctx);
  const next = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(rows).ctx);
  assertEquals(next.events, []);
});

test("new-site-audit-crawl: requests GET /site-audit/projects like the wrapped action", async () => {
  const m = ctx([]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(m.calls[0].url, "https://api.ahrefs.com/v3/site-audit/projects");
});
