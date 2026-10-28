import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `meet.conferenceRecords.transcripts.get` — GET `v2/{+name}`
 * (https://meet.googleapis.com/$discovery/rest?version=v2).
 */
const getTranscript: ActionDefinition<Input> = {
  key: "get-transcript",
  type: "read",
  resource: "transcript",
  title: "Get Transcript",
  description: "Retrieve a single conference transcript by resource name.",
  params: [
    {
      key: "name",
      label: "Transcript name",
      type: "string",
      required: true,
      hint: "`conferenceRecords/{conferenceRecord}/transcripts/{transcript}`.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Transcript name" },
    { key: "state", type: "string", label: "State (STARTED/ENDED/FILE_GENERATED)" },
    { key: "startTime", type: "string", label: "Start time" },
    { key: "endTime", type: "string", label: "End time" },
    { key: "docsDestination", type: "object", label: "Docs destination" },
  ],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    return client.request(`/${input.name}`);
  },
};

export default getTranscript;
