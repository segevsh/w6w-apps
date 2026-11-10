import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-video.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const video = (video_id: string) => ({ video_id, created_at: 1 });

test("new-video seeds, emits a new video, retries idempotently, and requests the literal newest page", async () => {
  const seedCtx = mockCtx([{ body: listEnvelope([video("a")]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seedCtx.calls[0].method, "GET");
  assertEquals(seedCtx.calls[0].url, "https://api.heygen.com/v3/videos?limit=100");

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: listEnvelope([video("b"), video("a")]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: listEnvelope([video("b"), video("a")]) }]).ctx,
  );
  assertEquals(first.events, [video("b")]);
  assertEquals(retry, first);
});
