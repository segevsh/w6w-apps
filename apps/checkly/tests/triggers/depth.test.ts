import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { TriggerDefinition } from "@w6w/types";
import newCheck from "../../triggers/new-check.ts";
import newOrUpdatedCheck from "../../triggers/new-or-updated-check.ts";
import newCheckGroup from "../../triggers/new-check-group.ts";
import newAlertChannel from "../../triggers/new-alert-channel.ts";
import newMaintenanceWindow from "../../triggers/new-maintenance-window.ts";
import newCheckAlert from "../../triggers/new-check-alert.ts";
import { clock } from "../../lib/since.ts";

const B = "https://api.checklyhq.com";
const sub = { subscriptionId: "s" };
const row = (id: string) => ({ id });

const snapshots: Array<{ key: string; trigger: TriggerDefinition; url: string }> = [
  {
    key: "new-check",
    trigger: newCheck as unknown as TriggerDefinition,
    url: `${B}/v1/checks?limit=100&page=1`,
  },
  {
    key: "new-or-updated-check",
    trigger: newOrUpdatedCheck as unknown as TriggerDefinition,
    url: `${B}/v1/checks?limit=100&page=1`,
  },
  {
    key: "new-check-group",
    trigger: newCheckGroup as unknown as TriggerDefinition,
    url: `${B}/v1/check-groups?limit=100&page=1`,
  },
  {
    key: "new-alert-channel",
    trigger: newAlertChannel as unknown as TriggerDefinition,
    url: `${B}/v1/alert-channels?limit=100&page=1`,
  },
  {
    key: "new-maintenance-window",
    trigger: newMaintenanceWindow as unknown as TriggerDefinition,
    url: `${B}/v1/maintenance-windows?limit=100&page=1`,
  },
];

for (const c of snapshots) {
  const input = { params: {}, ...sub };
  test(`${c.key}: seeds, emits only the new record, retries identically`, async () => {
    const seeded = await c.trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ body: [row("b"), row("a")] }]).ctx,
    );
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    const run = () =>
      c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body: [row("c"), row("b"), row("a")] }]).ctx,
      );
    const first = await run();
    assertEquals(first.events, [row("c")]);
    assertEquals(await run(), first);
  });

  test(`${c.key}: the request is the literal list call`, async () => {
    const m = mockCtx([{ body: [row("a")] }]);
    await c.trigger.poll!({ ...input, state: {} }, m.ctx);
    assertEquals(m.calls.length, 1);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(m.calls[0].url, c.url);
  });
}

test("snapshot triggers read every page before diffing", async () => {
  const full = Array.from({ length: 100 }, (_, i) => row(`p1-${i}`));
  const m = mockCtx([{ body: full }, { body: [row("p2-0")] }]);
  await newCheck.poll!({ params: {}, ...sub, state: {} }, m.ctx);
  assertEquals(m.calls.map((x) => x.url), [
    `${B}/v1/checks?limit=100&page=1`,
    `${B}/v1/checks?limit=100&page=2`,
  ]);
});

test("new-or-updated-check: an edit (new updated_at) is emitted once, new-check ignores it", async () => {
  const input = { params: {}, ...sub };
  const chk = (updated: string) => [{ id: "k1", updated_at: updated }];
  const seeded = await newOrUpdatedCheck.poll!(
    { ...input, state: {} },
    mockCtx([{ body: chk("2026-11-01") }]).ctx,
  );
  const same = await newOrUpdatedCheck.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: chk("2026-11-01") }]).ctx,
  );
  assertEquals(same.events, []);
  const edited = await newOrUpdatedCheck.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: chk("2026-11-09") }]).ctx,
  );
  assertEquals(edited.events, chk("2026-11-09"));
  const plainSeed = await newCheck.poll!(
    { ...input, state: {} },
    mockCtx([{ body: chk("2026-11-01") }]).ctx,
  );
  const plain = await newCheck.poll!(
    { ...input, state: plainSeed.nextState },
    mockCtx([{ body: chk("2026-11-09") }]).ctx,
  );
  assertEquals(plain.events, []);
});

// --- new-check-alert (since-filter) ---

const NOW = Date.UTC(2026, 10, 9, 10, 0, 0);
const iso = (ms: number) => new Date(ms).toISOString();
const alert = (id: string, createdMs: number) => ({ id, created_at: iso(createdMs) });
const alertInput = { params: {}, ...sub };

test("new-check-alert: seeds, emits only the new alert, retries identically", async () => {
  clock.now = () => NOW;
  const seeded = await newCheckAlert.poll!(
    { ...alertInput, state: {} },
    mockCtx([{ body: [alert("a", NOW - 1000)] }]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  clock.now = () => NOW + 300_000;
  const rows = [alert("b", NOW + 60_000), alert("a", NOW - 1000)];
  const run = () =>
    newCheckAlert.poll!({ ...alertInput, state: seeded.nextState }, mockCtx([{ body: rows }]).ctx);
  const first = await run();
  assertEquals(first.events, [alert("b", NOW + 60_000)]);
  assertEquals(await run(), first);
});

test("new-check-alert: requests check-alerts with from = now - 120 s, optionally per check", async () => {
  clock.now = () => NOW;
  const all = mockCtx([{ body: [] }]);
  await newCheckAlert.poll!({ ...alertInput, state: {} }, all.ctx);
  assertEquals(all.calls[0].method, "GET");
  assertEquals(all.calls[0].url, `${B}/v1/check-alerts?from=1794218280&limit=100&page=1`);
  const one = mockCtx([{ body: [] }]);
  await newCheckAlert.poll!({ params: { checkId: "chk-1" }, ...sub, state: {} }, one.ctx);
  assertEquals(one.calls[0].url, `${B}/v1/check-alerts/chk-1?from=1794218280&limit=100&page=1`);
});

test("new-check-alert: a window of several pages is drained in one check, none emitted twice", async () => {
  clock.now = () => NOW;
  const seeded = await newCheckAlert.poll!(
    { ...alertInput, state: {} },
    mockCtx([{ body: [] }]).ctx,
  );
  clock.now = () => NOW + 300_000;
  const made = Array.from({ length: 250 }, (_, i) => alert(`n${i}`, NOW + 1000 + i));
  const pages = () =>
    mockCtx([
      { body: made.slice(0, 100) },
      { body: made.slice(100, 200) },
      { body: made.slice(200) },
    ]);
  const m = pages();
  const first = await newCheckAlert.poll!({ ...alertInput, state: seeded.nextState }, m.ctx);
  assertEquals(first.events.length, 250);
  assertEquals(m.calls.length, 3);
  const again = await newCheckAlert.poll!({ ...alertInput, state: first.nextState }, pages().ctx);
  assertEquals(again.events, []);
  assert((again.nextState as { cursor: number }).cursor === NOW + 300_000, "cursor advanced");
});

test("new-check-alert: alerts created before the first check never fire later (floor)", async () => {
  clock.now = () => NOW;
  const seeded = await newCheckAlert.poll!(
    { ...alertInput, state: {} },
    mockCtx([{ body: [] }]).ctx,
  );
  assertEquals((seeded.nextState as { floor?: number }).floor, NOW);
  clock.now = () => NOW + 300_000;
  const old = Array.from({ length: 101 }, (_, i) => alert(`old${i}`, NOW - 60_000 - i));
  const m = mockCtx([{ body: old.slice(0, 100) }, { body: old.slice(100) }]);
  const quiet = await newCheckAlert.poll!({ ...alertInput, state: seeded.nextState }, m.ctx);
  assertEquals(quiet.events, []);
  clock.now = () => NOW + 600_000;
  const fresh = alert("fresh", NOW + 400_000);
  const late = await newCheckAlert.poll!(
    { ...alertInput, state: quiet.nextState },
    mockCtx([{ body: [fresh, ...old.slice(0, 5)] }]).ctx,
  );
  assertEquals(late.events, [fresh]);
});
