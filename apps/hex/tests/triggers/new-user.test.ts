import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, page } from "../_helpers.ts";
import trigger from "../../triggers/new-user.ts";

test("new-user seeds, emits, retries, and walks the cursor over every user page", async () => {
  const old = { id: "old" }, fresh = { id: "fresh" }, later = { id: "later" };
  const seed = mockCtx([{ body: page([old], "c1") }, { body: page([later]) }]);
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const next = () => mockCtx([{ body: page([old], "c1") }, { body: page([later, fresh]) }]).ctx;
  const result = await trigger.poll!({ params: {}, state: seeded.nextState } as never, next());
  assertEquals(result.events, [fresh]);
  assertEquals(
    await trigger.poll!({ params: {}, state: seeded.nextState } as never, next()),
    result,
  );
  assertEquals(seed.calls.map((c) => new URL(c.url).toString()), [
    "https://app.hex.tech/api/v1/users?sortBy=NAME&sortDirection=ASC&limit=500",
    "https://app.hex.tech/api/v1/users?sortBy=NAME&sortDirection=ASC&limit=500&after=c1",
  ]);
});
