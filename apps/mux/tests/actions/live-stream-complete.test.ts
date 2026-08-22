import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/live-stream-complete.ts";

Deno.test("live-stream-complete: PUTs to the complete route", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }]);
  await action.execute!({ liveStreamId: "ls1" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/video/v1/live-streams/ls1/complete");
});

Deno.test("live-stream-complete: a missing id is refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "liveStreamId");
});

/** It ends the broadcast without destroying the stream. */
Deno.test("live-stream-complete: says the stream survives", () => {
  assert(/stream itself survives/i.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
