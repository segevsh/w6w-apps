import { webhookTrigger } from "../lib/triggers.ts";

/** A meeting transcript has been generated (event `TranscriptReady`). */
const transcriptReady = webhookTrigger({
  key: "transcript-ready",
  title: "Transcript Ready",
  description:
    "Fires when tl;dv has generated a meeting's transcript (event TranscriptReady). The run gets the delivery id, the meeting id, the transcript text, its timed segments and the full payload.",
  event: "TranscriptReady",
  sample: {
    deliveryId: "webhook-456",
    event: "TranscriptReady",
    executedAt: "2026-11-09T10:32:00Z",
    meetingId: "meeting-123",
    name: null,
    happenedAt: null,
    url: null,
    duration: null,
    organizer: null,
    invitees: [],
    transcript: "Hello everyone, welcome to our standup meeting.",
    segments: [{
      startTime: 0,
      endTime: 5,
      text: "Hello everyone, welcome to our standup meeting.",
    }],
    notes: null,
    metadata: null,
    data: {
      id: "meeting-123",
      meetingId: "meeting-123",
      data: { transcript: "Hello everyone, welcome to our standup meeting." },
    },
  },
});

export default transcriptReady;
