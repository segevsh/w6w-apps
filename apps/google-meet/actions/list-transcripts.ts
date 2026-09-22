import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  parent: string;
  pageSize?: number;
  pageToken?: string;
}

/**
 * `meet.conferenceRecords.transcripts.list` — GET `v2/{+parent}/transcripts`
 * (https://meet.googleapis.com/$discovery/rest?version=v2).
 *
 * A transcript's `docsDestination` points at the Google Doc Meet generated;
 * `state` reaches `FILE_GENERATED` once that document is ready.
 */
const listTranscripts: ActionDefinition<Input> = {
  key: "list-transcripts",
  type: "read",
  resource: "transcript",
  title: "List Transcripts",
  description: "List the transcripts of a conference record. Returns one page.",
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
    { key: "transcripts", type: "array", label: "Transcripts" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    return client.request(`/${input.parent}/transcripts`, {
      query: {
        pageSize: input.pageSize,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listTranscripts;
