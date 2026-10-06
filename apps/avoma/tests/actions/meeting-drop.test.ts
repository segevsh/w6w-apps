import { assertEquals, assertRejects } from "@std/assert";
import meetingDrop from "../../actions/meeting-drop.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("meeting-drop: POSTs to /v1/meetings/{uuid}/drop/ and returns the 202 message", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { message: "Dropping meeting." } }]);
  const out = await meetingDrop.execute({ meetingUuid: "m1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/meetings/m1/drop/");
  assertEquals(calls[0].body, null);
  assertEquals(out, { message: "Dropping meeting." });
});

Deno.test("meeting-drop: a 406 uses the vendor's message key", async () => {
  const { ctx } = mockCtx([{ status: 406, body: { message: "Bot is not in the meeting" } }]);
  await assertRejects(
    async () => await meetingDrop.execute({ meetingUuid: "m1" }, ctx),
    Error,
    "406: Bot is not",
  );
});

Deno.test("meeting-drop: is a non-idempotent perform", () => {
  assertEquals(meetingDrop.type, "perform");
  assertEquals(meetingDrop.idempotent, false);
});
