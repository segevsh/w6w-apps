import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-reservation.ts";

test("new-reservation seeds, emits, retries, and requests booked-at descending", async () => {
  const old = { id: "old" }, fresh = { id: "fresh" };
  const seed = mockCtx([{ body: { data: [old] } }]);
  const seeded = await trigger.poll!(
    { params: { propertyIds: "p1" }, state: {} } as never,
    seed.ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const result = await trigger.poll!(
    { params: { propertyIds: "p1" }, state: seeded.nextState } as never,
    mockCtx([{ body: { data: [fresh, old] } }]).ctx,
  );
  assertEquals(result.events, [fresh]);
  assertEquals(
    await trigger.poll!(
      { params: { propertyIds: "p1" }, state: seeded.nextState } as never,
      mockCtx([{ body: { data: [fresh, old] } }]).ctx,
    ),
    result,
  );
  assertEquals(
    new URL(seed.calls[0].url).toString(),
    "https://public.api.hospitable.com/v2/reservations?properties%5B%5D=p1&page=1&per_page=100&sort%5Bdesc%5D=booked_at",
  );
});
