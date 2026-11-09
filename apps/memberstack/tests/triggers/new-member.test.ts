import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-member.ts";
import { mockCtx } from "../_helpers.ts";

test("new-member seeds, emits, retries, and requests the newest page", async () => {
  const seed = mockCtx([{ body: { data: [{ id: "old" }] } }]);
  const seeded = await trigger.poll!({ state: {}, params: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://admin.memberstack.com/members?limit=100&order=DESC");
  const responses = [{ body: { data: [{ id: "new" }, { id: "old" }] } }];
  const first = await trigger.poll!(
    { state: seeded.nextState, params: {} } as never,
    mockCtx(responses).ctx,
  );
  const retry = await trigger.poll!(
    { state: seeded.nextState, params: {} } as never,
    mockCtx(responses).ctx,
  );
  assertEquals(first.events, [{ id: "new" }]);
  assertEquals(retry, first);
});
