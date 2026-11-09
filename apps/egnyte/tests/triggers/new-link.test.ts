import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockEgnyteCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-link.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ id, path: `/Shared/${id}.pdf` });
const ctx = (links: unknown[]) => mockEgnyteCtx([{ body: { links } }]);
const NOW = Date.parse("2026-11-09T12:00:00.000Z");

test("new-link: first check seeds and emits nothing", async () => {
  clock.now = () => NOW;
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("b"), item("a")]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals((seeded.nextState as { cursor?: number }).cursor, NOW);
});

test("new-link: emits only the new link after seeding", async () => {
  clock.now = () => NOW;
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
  clock.now = () => NOW + 300_000;
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item("a"), item("b")]).ctx,
  );
  assertEquals(next.events, [item("b")]);
  const quiet = await trigger.poll!(
    { ...input, state: next.nextState },
    ctx([item("a"), item("b")]).ctx,
  );
  assertEquals(quiet.events, []);
});

test("new-link: retrying the same state and page is idempotent", async () => {
  clock.now = () => NOW;
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
  clock.now = () => NOW + 300_000;
  const page = [item("b"), item("c"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events.length, 2);
  assertEquals(retry, first);
});

test("new-link: requests links created after the previous check minus the overlap", async () => {
  clock.now = () => NOW;
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://acme.egnyte.com/pubapi/v2/links?created_after=2026-11-09T11%3A58%3A00.000Z&offset=0&count=500",
  );
  clock.now = () => NOW + 300_000;
  const second = await trigger.poll!({ ...input, state: seeded.nextState }, ctx([item("a")]).ctx);
  clock.now = () => NOW + 600_000;
  const third = ctx([item("a")]);
  await trigger.poll!({ ...input, state: second.nextState }, third.ctx);
  assertEquals(third.calls[0].method, "GET");
  assertEquals(
    third.calls[0].url,
    "https://acme.egnyte.com/pubapi/v2/links?created_after=2026-11-09T12%3A03%3A00.000Z&offset=0&count=500",
  );
});
