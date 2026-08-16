import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/notes-get.ts";

const NOTES = {
  structuredNotes: [
    { segmentId: "s1", timestamp: 12.5, text: "Discussed roadmap", topicId: "t1" },
  ],
  markdownContent: "## Roadmap\n- Discussed roadmap",
  topics: [{ id: "t1", order: 0, title: "Roadmap", summary: "Discussed roadmap" }],
};

Deno.test("notes-get: hits GET /meetings/{meetingId}/notes and returns the notes verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: NOTES }]);
  const out = await action.execute({ meetingId: "m1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1alpha1/meetings/m1/notes");
  assertEquals(out, NOTES);
});
