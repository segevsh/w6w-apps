import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  parent: string;
  pageSize?: number;
  pageToken?: string;
}

/**
 * `meet.conferenceRecords.transcripts.entries.list` — GET
 * `v2/{+parent}/entries` (https://meet.googleapis.com/$discovery/rest?version=v2).
 *
 * One entry per stretch of speech: `text` is the recognized speech,
 * `participant` names who spoke, and `languageCode` is IETF BCP 47.
 */
const listTranscriptEntries: ActionDefinition<Input> = {
  key: "list-transcript-entries",
  type: "read",
  resource: "transcript-entry",
  title: "List Transcript Entries",
  description: "List the speech entries of a transcript. Returns one page.",
  params: [
    {
      key: "parent",
      label: "Transcript",
      type: "string",
      required: true,
      hint: "`conferenceRecords/{conferenceRecord}/transcripts/{transcript}`.",
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
    { key: "transcriptEntries", type: "array", label: "Transcript entries" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    return client.request(`/${input.parent}/entries`, {
      query: {
        pageSize: input.pageSize,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listTranscriptEntries;
