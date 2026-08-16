import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/transcript-get.ts";

const TRANSCRIPT = {
  id: "t1",
  meetingId: "m1",
  data: [
    { speaker: "Ada", text: "Let's get started.", startTime: 0, endTime: 2.5 },
  ],
};

Deno.test("transcript-get: hits GET /meetings/{meetingId}/transcript", async () => {
  const { ctx, calls } = mockCtx([{ body: TRANSCRIPT }]);
  const out = await action.execute({ meetingId: "m1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1alpha1/meetings/m1/transcript");
  assertEquals(out, TRANSCRIPT);
});

Deno.test("transcript-get: a 404 (still processing / missing) throws with the vendor's message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { name: "NotFoundError", message: "Meeting not found" },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute({ meetingId: "missing" }, ctx)),
    Error,
    "NotFoundError",
  );
});
