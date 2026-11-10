import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-task.ts";

test("new-task seeds, emits, retries, and requests a bounded task page", async () => {
  const old = { id: 1 }, fresh = { id: 2 };
  const seed = mockCtx([{ body: { tasks: [old] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const result = await trigger.poll!(
    { params: {}, state: seeded.nextState } as never,
    mockCtx([{ body: { tasks: [fresh, old] } }]).ctx,
  );
  assertEquals(result.events, [fresh]);
  assertEquals(
    await trigger.poll!(
      { params: {}, state: seeded.nextState } as never,
      mockCtx([{ body: { tasks: [fresh, old] } }]).ctx,
    ),
    result,
  );
  assertEquals(
    new URL(seed.calls[0].url).toString(),
    "https://api.harvestapp.com/v2/tasks?per_page=100",
  );
});
