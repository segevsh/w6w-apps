import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "../actions/_shared.ts";
import trigger from "../../triggers/new-cohort.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const cohort = (id: string, size = 1) => ({ id, name: `Cohort ${id}`, size, last_computed: size });
const ctx = (...cohorts: unknown[][]) =>
  mockCtx(cohorts.map((c) => ok({ cohorts: c })), { display });

test("new-cohort seeds, emits only the new cohort, retries, and ignores size drift", async () => {
  const seed = ctx([cohort("a"), cohort("b")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(new URL(seed.calls[0].url).pathname, "/api/3/cohorts");
  const page = [cohort("a", 99), cohort("b", 50), cohort("c")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [cohort("c")]);
  assertEquals(retry, first);
  const drift = await trigger.poll!({ ...input, state: first.nextState }, ctx(page).ctx);
  assertEquals(drift.events, []);
});

test("new-cohort refuses a response of more than 5000 cohorts (the kit cap)", async () => {
  const many = Array.from({ length: 5001 }, (_, i) => cohort(String(i)));
  await assertRejects(() => trigger.poll!({ ...input, state: {} }, ctx(many).ctx), Error, "5000");
});
