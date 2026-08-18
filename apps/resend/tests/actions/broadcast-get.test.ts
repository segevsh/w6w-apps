import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/broadcast-get.ts";

Deno.test("broadcast-get: fetches one broadcast", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "b_1", status: "sent" } }], {
    display: {},
  });
  const result = await action.execute!({ broadcastId: "b_1" }, ctx);
  assertEquals(calls[0].url, "https://api.resend.com/broadcasts/b_1");
  assertEquals((result as Record<string, unknown>).status, "sent");
});

Deno.test("broadcast-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`broadcastId`");
  assertEquals(calls.length, 0);
});
