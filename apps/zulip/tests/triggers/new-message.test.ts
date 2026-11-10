import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-message.ts";

test("new-message seeds, emits additions, retries, and requests newest messages literally", async () => {
  const response = (messages: unknown[]) => ({ body: { result: "success", msg: "", messages } });
  const seedCtx = mockCtx([response([{ id: 1 }])]);
  const seeded = await trigger.poll!({ params: {}, subscriptionId: "sub", state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    new URL(seedCtx.calls[0].url).toString(),
    "https://acme.zulipchat.com/api/v1/messages?apply_markdown=false&anchor=newest&num_before=100&num_after=0",
  );
  const first = await trigger.poll!(
    { params: {}, subscriptionId: "sub", state: seeded.nextState },
    mockCtx([response([{ id: 1 }, { id: 2 }])]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, subscriptionId: "sub", state: seeded.nextState },
    mockCtx([response([{ id: 1 }, { id: 2 }])]).ctx,
  );
  assertEquals(first.events, [{ id: 2 }]);
  assertEquals(retry, first);
  const burst = await trigger.poll!(
    { params: {}, subscriptionId: "sub", state: seeded.nextState },
    mockCtx([response([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }])]).ctx,
  );
  assertEquals(burst.events, [{ id: 2 }, { id: 3 }, { id: 4 }]); // oldest first
});
