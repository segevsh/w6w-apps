import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  filter?: string;
  pageSize?: number;
  pageToken?: string;
}

/**
 * `meet.conferenceRecords.list` — GET `v2/conferenceRecords`
 * (https://meet.googleapis.com/$discovery/rest?version=v2).
 *
 * A conference record is one instance of a call held in a space. This method is
 * the only list in the API with no `parent` — it spans every space the
 * credential can see, which is what the `filter` is for.
 */
const listConferenceRecords: ActionDefinition<Input> = {
  key: "list-conference-records",
  type: "read",
  resource: "conference-record",
  title: "List Conference Records",
  description: "List conference records across the account. Returns one page.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint:
        'EBNF filter over `space.meeting_code`, `space.name`, `start_time`, `end_time`, e.g. `space.name = "spaces/abc"`.',
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "At most 25 when unset; values above 100 are coerced to 100.",
    },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "conferenceRecords", type: "array", label: "Conference records" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    return client.request("/conferenceRecords", {
      query: {
        filter: input.filter,
        pageSize: input.pageSize,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listConferenceRecords;
