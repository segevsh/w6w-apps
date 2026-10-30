import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/live-meeting-join.ts";

const OK = { data: { addToLiveMeeting: { success: true } } };

test("live-meeting-join: sends the meeting link as a required variable", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ meetingLink: "https://meet.google.com/abc-defg-hij" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("$meetingLink: String!"));
  assert(query.includes("addToLiveMeeting("));
  assertEquals(variables, { meetingLink: "https://meet.google.com/abc-defg-hij" });
});

test("live-meeting-join: duration is inlined as an integer literal", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ meetingLink: "https://zoom.us/j/1", duration: 90 }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("duration: 90"));
  assertEquals(variables.duration, undefined);
});

test("live-meeting-join: expected attendees become attendee objects", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ meetingLink: "https://zoom.us/j/1", attendeeEmails: "a@b.com" }, ctx);
  assertEquals(sent(calls[0]).variables.attendees, [{ email: "a@b.com" }]);
});

test("live-meeting-join: sending the bot twice is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
