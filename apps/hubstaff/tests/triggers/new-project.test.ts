import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-project.ts";

test("new-project seeds, emits, retries, and walks every project page", async () => {
  const old = { id: 1 }, fresh = { id: 2 }, later = { id: 3 };
  const input = (state: unknown) => ({ params: { organizationId: 7 }, state }) as never;
  const seed = mockCtx([
    { body: listEnvelope("projects", [old], 50) },
    { body: listEnvelope("projects", [later]) },
  ]);
  const seeded = await trigger.poll!(input({}), seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const next = () =>
    mockCtx([
      { body: listEnvelope("projects", [old], 50) },
      { body: listEnvelope("projects", [later, fresh]) },
    ]).ctx;
  const result = await trigger.poll!(input(seeded.nextState), next());
  assertEquals(result.events, [fresh]);
  assertEquals(await trigger.poll!(input(seeded.nextState), next()), result);
  assertEquals(seed.calls.map((c) => new URL(c.url).toString()), [
    "https://api.hubstaff.com/v2/organizations/7/projects?status=all&page_limit=100",
    "https://api.hubstaff.com/v2/organizations/7/projects?status=all&page_start_id=50&page_limit=100",
  ]);
});

test("new-project does not fire when an existing project is edited", async () => {
  const input = (state: unknown) => ({ params: { organizationId: 7 }, state }) as never;
  const seeded = await trigger.poll!(
    input({}),
    mockCtx([{ body: listEnvelope("projects", [{ id: 1, name: "Website" }]) }]).ctx,
  );
  const result = await trigger.poll!(
    input(seeded.nextState),
    mockCtx([{ body: listEnvelope("projects", [{ id: 1, name: "Website v2" }]) }]).ctx,
  );
  assertEquals(result.events, []);
});
