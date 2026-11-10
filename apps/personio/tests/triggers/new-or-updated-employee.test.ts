import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-employee.ts";
import { clock } from "../../lib/triggers.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
const URL_AT_NOW =
  "https://api.personio.de/v1/company/employees?updated_since=2026-11-10T11%3A50%3A00";
const emp = (id: number, modified: string) => ({
  attributes: { id: { value: id }, last_modified_at: { value: modified } },
});

test("new-or-updated-employee: seeds without emitting and requests the since-filtered feed", async () => {
  clock.now = () => NOW;
  const seed = mockCtx([{ body: { data: [emp(1, "2026-11-10T11:55:00+00:00")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, URL_AT_NOW);
});

test("new-or-updated-employee: emits a new and an edited employee; retry is idempotent", async () => {
  clock.now = () => NOW;
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { data: [emp(1, "2026-11-10T11:55:00+00:00")] } }]).ctx,
  );
  clock.now = () => NOW + 300_000;
  const page = { data: [emp(2, "2026-11-10T12:01:00+00:00"), emp(1, "2026-11-10T12:02:00+00:00")] };
  const run = () =>
    trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: page }]).ctx);
  const first = await run();
  assertEquals(first.events.length, 2);
  assertEquals(await run(), first);
});

test("new-or-updated-employee: an unchanged employee is not re-emitted", async () => {
  clock.now = () => NOW;
  const body = { data: [emp(1, "2026-11-10T11:55:00+00:00")] };
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([{ body }]).ctx);
  clock.now = () => NOW + 300_000;
  const res = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body }]).ctx);
  assertEquals(res.events, []);
});
