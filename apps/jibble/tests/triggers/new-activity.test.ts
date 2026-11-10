import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, odataList } from "../_helpers.ts";
import trigger from "../../triggers/new-activity.ts";

test("new-activity seeds, emits, retries, and requests created-at descending", async () => {
  const old = { id: "old" }, fresh = { id: "fresh" };
  const seed = mockCtx([{ body: odataList([old]) }]);
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const result = await trigger.poll!(
    { params: {}, state: seeded.nextState } as never,
    mockCtx([{ body: odataList([fresh, old]) }]).ctx,
  );
  assertEquals(result.events, [fresh]);
  assertEquals(
    await trigger.poll!(
      { params: {}, state: seeded.nextState } as never,
      mockCtx([{ body: odataList([fresh, old]) }]).ctx,
    ),
    result,
  );
  assertEquals(
    new URL(seed.calls[0].url).toString(),
    "https://workspace.prod.jibble.io/v1/Activities?%24orderby=createdAt+desc&%24top=100&%24skip=0",
  );
});
