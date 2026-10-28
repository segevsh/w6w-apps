import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  parent: string;
  pageSize?: number;
  pageToken?: string;
}

/**
 * `meet.conferenceRecords.recordings.list` — GET `v2/{+parent}/recordings`
 * (https://meet.googleapis.com/$discovery/rest?version=v2).
 *
 * A recording's `driveDestination` carries the Drive `file` id to download the
 * MP4 through the Drive API, plus an `exportUri` to play it back in a browser.
 */
const listRecordings: ActionDefinition<Input> = {
  key: "list-recordings",
  type: "read",
  resource: "recording",
  title: "List Recordings",
  description: "List the recordings of a conference record. Returns one page.",
  params: [
    {
      key: "parent",
      label: "Conference record",
      type: "string",
      required: true,
      hint: "`conferenceRecords/{conferenceRecord}`.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "At most 10 when unset; values above 100 are coerced to 100.",
    },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "recordings", type: "array", label: "Recordings" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    return client.request(`/${input.parent}/recordings`, {
      query: {
        pageSize: input.pageSize,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listRecordings;
