import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `meet.conferenceRecords.recordings.get` — GET `v2/{+name}`
 * (https://meet.googleapis.com/$discovery/rest?version=v2).
 */
const getRecording: ActionDefinition<Input> = {
  key: "get-recording",
  type: "read",
  resource: "recording",
  title: "Get Recording",
  description: "Retrieve a single conference recording by resource name.",
  params: [
    {
      key: "name",
      label: "Recording name",
      type: "string",
      required: true,
      hint: "`conferenceRecords/{conferenceRecord}/recordings/{recording}`.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Recording name" },
    { key: "state", type: "string", label: "State (STARTED/ENDED/FILE_GENERATED)" },
    { key: "startTime", type: "string", label: "Start time" },
    { key: "endTime", type: "string", label: "End time" },
    { key: "driveDestination", type: "object", label: "Drive destination" },
  ],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    return client.request(`/${input.name}`);
  },
};

export default getRecording;
