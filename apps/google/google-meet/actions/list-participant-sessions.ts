import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  parent: string;
  filter?: string;
  pageSize?: number;
  pageToken?: string;
}

/**
 * `meet.conferenceRecords.participants.participantSessions.list` — GET
 * `v2/{+parent}/participantSessions`
 * (https://meet.googleapis.com/$discovery/rest?version=v2).
 *
 * A participant session is one join/leave interval from one device. Every join
 * mints a new session id, so a participant who reconnects has more than one.
 */
const listParticipantSessions: ActionDefinition<Input> = {
  key: "list-participant-sessions",
  type: "read",
  resource: "participant-session",
  title: "List Participant Sessions",
  description: "List a participant's join/leave sessions in a conference. Returns one page.",
  params: [
    {
      key: "parent",
      label: "Participant",
      type: "string",
      required: true,
      hint: "`conferenceRecords/{conferenceRecord}/participants/{participant}`.",
    },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint:
        "EBNF filter over `start_time` and `end_time`, e.g. `end_time IS NULL` for still-active sessions.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "At most 100 when unset; values above 250 are coerced to 250.",
    },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "participantSessions", type: "array", label: "Participant sessions" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    return client.request(`/${input.parent}/participantSessions`, {
      query: {
        filter: input.filter,
        pageSize: input.pageSize,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listParticipantSessions;
