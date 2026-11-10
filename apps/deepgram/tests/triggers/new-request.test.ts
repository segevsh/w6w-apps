import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-request.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ request_id: id });
const response = (items: unknown[]) => ({ body: { requests: items } });

test("new-request: seeds, emits new requests, retries idempotently, and uses the documented time filter", async () => {
  const original = clock.now;
  clock.now = () => 1_700_000_000_000;
  try {
    const seed = mockCtx([response([item("a")])], { display: { projectId: "proj_1" } });
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(
      seed.calls[0].url,
      "https://api.deepgram.com/v1/projects/proj_1/requests?start=2023-11-14&end=2023-11-14&limit=100",
    );
    const page = [item("b"), item("a")];
    const first = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([response(page)], { display: { projectId: "proj_1" } }).ctx,
    );
    const retry = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([response(page)], { display: { projectId: "proj_1" } }).ctx,
    );
    assertEquals(first.events, [item("b")]);
    assertEquals(retry, first);
  } finally {
    clock.now = original;
  }
});
