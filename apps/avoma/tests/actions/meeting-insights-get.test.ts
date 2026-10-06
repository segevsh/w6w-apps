import { assertEquals, assertRejects } from "@std/assert";
import insights from "../../actions/meeting-insights-get.ts";
import { detail, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("meeting-insights-get: GET /v1/meetings/{uuid}/insights/", async () => {
  const body = { ai_notes: [{ text: "n" }], keywords: { popular: [] }, speakers: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await insights.execute({ meetingUuid: "m1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/meetings/m1/insights/");
  assertEquals(out, body);
});

Deno.test("meeting-insights-get: a not-yet-completed meeting's 404 is reported", async () => {
  const { ctx } = mockCtx([{ status: 404, body: detail("Meeting not completed") }]);
  await assertRejects(
    async () => await insights.execute({ meetingUuid: "m1" }, ctx),
    Error,
    "Meeting not completed",
  );
});
