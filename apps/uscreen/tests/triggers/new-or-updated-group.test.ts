import trigger from "../../triggers/new-or-updated-group.ts";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import { sinceSuite, T0 } from "./_suite.ts";
import { test } from "node:test";

sinceSuite(
  "new-or-updated-group",
  trigger,
  "https://uscreen.io/publisher_api/v1/groups",
  "updated_at",
);

test("new-or-updated-group: an edited group is a new event, an unchanged one is not", async () => {
  const base = "https://uscreen.io/publisher_api/v1/groups";
  const rec = (updated: number) => ({
    id: 5,
    created_at: T0 / 1000 - 3600,
    updated_at: updated,
  });
  const resp = (updated: number) => ({
    body: [rec(updated)],
    headers: { "content-type": "application/json" },
  });
  const run = async (state: unknown, updated: number) => {
    const m = mockCtx([resp(updated)]);
    const r = await trigger.poll!({ params: {}, state, subscriptionId: "s" }, m.ctx);
    return { r, calls: m.calls };
  };
  clock.now = () => T0;
  const seeded = await run({}, T0 / 1000 - 10);
  assertEquals(seeded.r.events, []);
  clock.now = () => T0 + 300_000;
  const first = await run(seeded.r.nextState, T0 / 1000 + 60);
  assertEquals(first.r.events.length, 1);
  assertEquals(
    first.calls[0].url,
    `${base}?from=2026-11-08T23%3A58%3A00.000Z&date_field=updated_at&page=1`,
  );
  clock.now = () => T0 + 600_000;
  const same = await run(first.r.nextState, T0 / 1000 + 60);
  assertEquals(same.r.events, []);
  clock.now = () => T0 + 900_000;
  const edited = await run(same.r.nextState, T0 / 1000 + 700);
  assertEquals(edited.r.events.length, 1);
});
