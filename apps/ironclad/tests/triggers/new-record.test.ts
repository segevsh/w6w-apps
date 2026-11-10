import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, page } from "../_helpers.ts";
import trigger from "../../triggers/new-record.ts";

test("new-record seeds, emits, retries, and requests descending agreement dates", async () => {
  const old = { id: "old" }, fresh = { id: "fresh" };
  const seed = mockCtx([{ body: page([old]) }]);
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const result = await trigger.poll!(
    { params: {}, state: seeded.nextState } as never,
    mockCtx([{ body: page([fresh, old]) }]).ctx,
  );
  assertEquals(result.events, [fresh]);
  assertEquals(
    await trigger.poll!(
      { params: {}, state: seeded.nextState } as never,
      mockCtx([{ body: page([fresh, old]) }]).ctx,
    ),
    result,
  );
  assertEquals(
    new URL(seed.calls[0].url).toString(),
    "https://ironcladapp.com/public/api/v1/records?page=0&pageSize=100&sortField=agreementDate&sortDirection=DESC",
  );
});
