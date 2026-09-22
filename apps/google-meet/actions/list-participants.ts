import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  parent: string;
  filter?: string;
  pageSize?: number;
  pageToken?: string;
}

/**
 * `meet.conferenceRecords.participants.list` — GET `v2/{+parent}/participants`
 * (https://meet.googleapis.com/$discovery/rest?version=v2).
 *
 * A participant is one person in that conference record; each has exactly one
 * of `signedinUser`, `anonymousUser` or `phoneUser` set.
 */
const listParticipants: ActionDefinition<Input> = {
  key: "list-participants",
  type: "read",
  resource: "participant",
  title: "List Participants",
  description: "List the participants of a conference record. Returns one page.",
  params: [
    {
      key: "parent",
      label: "Conference record",
      type: "string",
      required: true,
      hint: "`conferenceRecords/{conferenceRecord}`.",
    },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint:
        "EBNF filter over `earliest_start_time` and `latest_end_time`, e.g. `latest_end_time IS NULL` for participants still in the call.",
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
    { key: "participants", type: "array", label: "Participants" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    return client.request(`/${input.parent}/participants`, {
      query: {
        filter: input.filter,
        pageSize: input.pageSize,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listParticipants;
