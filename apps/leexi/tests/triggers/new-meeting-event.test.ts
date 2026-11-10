import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-meeting-event.ts";
import { mockCtx } from "../_helpers.ts";

test("new-meeting-event seeds, emits, retries, and requests the newest page", async () => {
  const seed = mockCtx([{ body: { data: [{ uuid: "old" }] } }]);
  const seeded = await trigger.poll!({ state: {}, params: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://public-api.leexi.ai/v1/meeting_events?page=1&items=100&order=created_at%20desc",
  );
  const responses = [{ body: { data: [{ uuid: "new" }, { uuid: "old" }] } }];
  const first = await trigger.poll!(
    { state: seeded.nextState, params: {} } as never,
    mockCtx(responses).ctx,
  );
  const retry = await trigger.poll!(
    { state: seeded.nextState, params: {} } as never,
    mockCtx(responses).ctx,
  );
  assertEquals(first.events, [{ uuid: "new" }]);
  assertEquals(retry, first);
});
