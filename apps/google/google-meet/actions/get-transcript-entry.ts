import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `meet.conferenceRecords.transcripts.entries.get` — GET `v2/{+name}`
 * (https://meet.googleapis.com/$discovery/rest?version=v2).
 */
const getTranscriptEntry: ActionDefinition<Input> = {
  key: "get-transcript-entry",
  type: "read",
  resource: "transcript-entry",
  title: "Get Transcript Entry",
  description: "Retrieve a single transcript entry by resource name.",
  params: [
    {
      key: "name",
      label: "Transcript entry name",
      type: "string",
      required: true,
      hint: "`conferenceRecords/{conferenceRecord}/transcripts/{transcript}/entries/{entry}`.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Transcript entry name" },
    { key: "participant", type: "string", label: "Participant" },
    { key: "text", type: "string", label: "Text" },
    { key: "languageCode", type: "string", label: "Language code" },
    { key: "startTime", type: "string", label: "Start time" },
    { key: "endTime", type: "string", label: "End time" },
  ],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    return client.request(`/${input.name}`);
  },
};

export default getTranscriptEntry;
