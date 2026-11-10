import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-inference-model.ts";

test("new-inference-model seeds, emits, retries, and reads the router catalogue", async () => {
  const old = { id: "old" }, fresh = { id: "fresh" };
  const seed = mockCtx([{ body: { data: [old] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const result = await trigger.poll!(
    { params: {}, state: seeded.nextState } as never,
    mockCtx([{ body: { data: [fresh, old] } }]).ctx,
  );
  assertEquals(result.events, [fresh]);
  assertEquals(
    await trigger.poll!(
      { params: {}, state: seeded.nextState } as never,
      mockCtx([{ body: { data: [fresh, old] } }]).ctx,
    ),
    result,
  );
  assertEquals({ method: seed.calls[0].method, url: seed.calls[0].url }, {
    method: "GET",
    url: "https://router.huggingface.co/v1/models",
  });
});
