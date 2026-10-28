import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `meet.conferenceRecords.participants.participantSessions.get` — GET
 * `v2/{+name}` (https://meet.googleapis.com/$discovery/rest?version=v2).
 */
const getParticipantSession: ActionDefinition<Input> = {
  key: "get-participant-session",
  type: "read",
  resource: "participant-session",
  title: "Get Participant Session",
  description: "Retrieve a single participant session by resource name.",
  params: [
    {
      key: "name",
      label: "Participant session name",
      type: "string",
      required: true,
      hint:
        "`conferenceRecords/{conferenceRecord}/participants/{participant}/participantSessions/{session}`.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Participant session name" },
    { key: "startTime", type: "string", label: "Start time" },
    { key: "endTime", type: "string", label: "End time" },
  ],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    return client.request(`/${input.name}`);
  },
};

export default getParticipantSession;
