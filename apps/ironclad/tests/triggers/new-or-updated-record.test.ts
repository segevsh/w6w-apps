import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, page } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-record.ts";

test("new-or-updated-record seeds, emits edits, retries, and requests lastUpdated descending", async () => {
  const old = { id: "same", lastUpdated: "2026-01-01T00:00:00Z" };
  const edited = { id: "same", lastUpdated: "2026-01-02T00:00:00Z" };
  const seed = mockCtx([{ body: page([old]) }]);
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const result = await trigger.poll!(
    { params: {}, state: seeded.nextState } as never,
    mockCtx([{ body: page([edited, old]) }]).ctx,
  );
  assertEquals(result.events, [edited]);
  assertEquals(
    await trigger.poll!(
      { params: {}, state: seeded.nextState } as never,
      mockCtx([{ body: page([edited, old]) }]).ctx,
    ),
    result,
  );
  assertEquals(
    new URL(seed.calls[0].url).toString(),
    "https://ironcladapp.com/public/api/v1/records?page=0&pageSize=100&sortField=lastUpdated&sortDirection=DESC",
  );
});
