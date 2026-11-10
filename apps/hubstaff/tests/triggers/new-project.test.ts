import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-project.ts";

test("new-project seeds, emits, retries, and requests a bounded project page", async () => {
  const old = { id: 1 }, fresh = { id: 2 };
  const seed = mockCtx([{ body: listEnvelope("projects", [old]) }]);
  const seeded = await trigger.poll!(
    { params: { organizationId: 7 }, state: {} } as never,
    seed.ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const result = await trigger.poll!(
    { params: { organizationId: 7 }, state: seeded.nextState } as never,
    mockCtx([{ body: listEnvelope("projects", [fresh, old]) }]).ctx,
  );
  assertEquals(result.events, [fresh]);
  assertEquals(
    await trigger.poll!(
      { params: { organizationId: 7 }, state: seeded.nextState } as never,
      mockCtx([{ body: listEnvelope("projects", [fresh, old]) }]).ctx,
    ),
    result,
  );
  assertEquals(
    new URL(seed.calls[0].url).toString(),
    "https://api.hubstaff.com/v2/organizations/7/projects?status=all&page_limit=100",
  );
});
