import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/track.ts";

Deno.test("track: posts event + userId + properties to /track", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute!(
    { event: "Order Completed", userId: "u1", properties: { revenue: 9.99 } },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.segment.io/v1/track");
  assertEquals(JSON.parse(calls[0].body!), {
    event: "Order Completed",
    userId: "u1",
    properties: { revenue: 9.99 },
  });
  assertEquals(result, { success: true });
});

Deno.test("track: rejects a blank event", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ event: "  ", userId: "u1" }, ctx),
    Error,
    "`event` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("track: rejects when neither userId nor anonymousId is set", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ event: "Signed Up" }, ctx),
    Error,
    "either `userId` or `anonymousId` is required",
  );
});

Deno.test("track: anonymousId alone satisfies the identity requirement", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ event: "Page Viewed", anonymousId: "anon-1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { event: "Page Viewed", anonymousId: "anon-1" });
});
