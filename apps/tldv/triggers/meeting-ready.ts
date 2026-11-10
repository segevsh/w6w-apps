import { webhookTrigger } from "../lib/triggers.ts";

/** A meeting has finished processing (event `MeetingReady`). */
const meetingReady = webhookTrigger({
  key: "meeting-ready",
  title: "Meeting Ready",
  description:
    "Fires when tl;dv finishes processing a meeting (event MeetingReady). The run gets the delivery id, the meeting id, name, date, URL and duration, the organizer and invitees, the notes, the metadata sent with an import, the transcript when the webhook is set to include it, and the full payload.",
  event: "MeetingReady",
  sample: {
    deliveryId: "webhook-123",
    event: "MeetingReady",
    executedAt: "2026-11-09T10:31:00Z",
    meetingId: "meeting-123",
    name: "Team Standup Meeting",
    happenedAt: "2026-11-09T10:00:00Z",
    url: null,
    duration: 1800,
    organizer: { name: "Ada Lovelace", email: "ada@example.com" },
    invitees: [{ name: "Grace Hopper", email: "grace@example.com" }],
    transcript: null,
    segments: [],
    notes: { markdownContent: "## Summary\n- Discussed progress and blockers" },
    metadata: { crmRecordId: "rec_123" },
    data: { id: "meeting-123", name: "Team Standup Meeting", duration: 1800 },
  },
});

export default meetingReady;
