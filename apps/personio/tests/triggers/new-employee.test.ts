import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-employee.ts";
import { clock } from "../../lib/triggers.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
// cursor - 10 min overlap, as the trigger binds `updated_since`.
const URL_AT_NOW =
  "https://api.personio.de/v1/company/employees?updated_since=2026-11-10T11%3A50%3A00";
const emp = (id: number, created: string, modified = created) => ({
  attributes: {
    id: { value: id },
    created_at: { value: created },
    last_modified_at: { value: modified },
  },
});

test("new-employee: seeds without emitting and requests the since-filtered feed", async () => {
  clock.now = () => NOW;
  const seed = mockCtx([{ body: { data: [emp(1, "2026-11-10T11:55:00+00:00")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, URL_AT_NOW);
});

test("new-employee: emits only the unseen employee, and a retry is idempotent", async () => {
  clock.now = () => NOW;
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { data: [emp(1, "2026-11-10T11:55:00+00:00")] } }]).ctx,
  );
  clock.now = () => NOW + 300_000;
  const page = { data: [emp(2, "2026-11-10T12:01:00+00:00"), emp(1, "2026-11-10T11:55:00+00:00")] };
  const run = () =>
    trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: page }]).ctx);
  const first = await run();
  assertEquals(first.events.map((e) => (e as { id: number }).id), [2]);
  assertEquals(await run(), first);
});

test("new-employee: an edited old employee is not a new employee", async () => {
  clock.now = () => NOW;
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { data: [] } }]).ctx,
  );
  clock.now = () => NOW + 300_000;
  const res = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{
      body: { data: [emp(7, "2024-01-01T00:00:00+00:00", "2026-11-10T12:02:00+00:00")] },
    }]).ctx,
  );
  assertEquals(res.events, []);
});
