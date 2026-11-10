import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-lead.ts";

test("new-lead seeds, emits, retries, and requests the bounded lead page", async () => {
  const old = { id: 1 }, fresh = { id: 2 };
  const seed = mockCtx([{ body: envelope({ leads: [old] }) }]);
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const result = await trigger.poll!(
    { params: {}, state: seeded.nextState } as never,
    mockCtx([{ body: envelope({ leads: [fresh, old] }) }]).ctx,
  );
  assertEquals(result.events, [fresh]);
  assertEquals(
    await trigger.poll!(
      { params: {}, state: seeded.nextState } as never,
      mockCtx([{ body: envelope({ leads: [fresh, old] }) }]).ctx,
    ),
    result,
  );
  assertEquals(
    new URL(seed.calls[0].url).toString(),
    "https://api.hunter.io/v2/leads?limit=100&offset=0",
  );
});
