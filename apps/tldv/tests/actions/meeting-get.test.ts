import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/meeting-get.ts";

const MEETING = {
  id: "653663ac7c8dbd00130f11d9",
  name: "Weekly sync",
  happenedAt: "2024-01-15T09:00:00.000Z",
  url: "https://app.tldv.io/meetings/653663ac7c8dbd00130f11d9",
  duration: 1800,
  organizer: { name: "Ada", email: "ada@example.com" },
  invitees: [{ name: "Ada", email: "ada@example.com" }],
  template: { id: "template-1", label: "Standup Template" },
  extraProperties: { conferenceId: "conf-123" },
};

Deno.test("meeting-get: hits GET /meetings/{meetingId} and returns the meeting verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: MEETING }]);
  const out = await action.execute({ meetingId: "653663ac7c8dbd00130f11d9" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1alpha1/meetings/653663ac7c8dbd00130f11d9");
  assertEquals(out, MEETING);
});

Deno.test("meeting-get: URL-encodes a meetingId that needs it", async () => {
  const { ctx, calls } = mockCtx([{ body: MEETING }]);
  await action.execute({ meetingId: "has space/slash" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1alpha1/meetings/has%20space%2Fslash");
});
