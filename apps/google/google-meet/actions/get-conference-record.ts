import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `meet.conferenceRecords.get` — GET `v2/{+name}`
 * (https://meet.googleapis.com/$discovery/rest?version=v2).
 */
const getConferenceRecord: ActionDefinition<Input> = {
  key: "get-conference-record",
  type: "read",
  resource: "conference-record",
  title: "Get Conference Record",
  description: "Retrieve a single conference record by resource name.",
  params: [
    {
      key: "name",
      label: "Conference record name",
      type: "string",
      required: true,
      hint: "`conferenceRecords/{conferenceRecord}`.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Conference record name" },
    { key: "startTime", type: "string", label: "Start time" },
    { key: "endTime", type: "string", label: "End time" },
    { key: "expireTime", type: "string", label: "Expire time" },
    { key: "space", type: "string", label: "Space" },
  ],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    return client.request(`/${input.name}`);
  },
};

export default getConferenceRecord;
