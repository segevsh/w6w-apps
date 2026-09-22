import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `meet.conferenceRecords.participants.get` — GET `v2/{+name}`
 * (https://meet.googleapis.com/$discovery/rest?version=v2).
 */
const getParticipant: ActionDefinition<Input> = {
  key: "get-participant",
  type: "read",
  resource: "participant",
  title: "Get Participant",
  description: "Retrieve a single conference participant by resource name.",
  params: [
    {
      key: "name",
      label: "Participant name",
      type: "string",
      required: true,
      hint: "`conferenceRecords/{conferenceRecord}/participants/{participant}`.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Participant name" },
    { key: "earliestStartTime", type: "string", label: "Earliest start time" },
    { key: "latestEndTime", type: "string", label: "Latest end time" },
    { key: "signedinUser", type: "object", label: "Signed-in user" },
    { key: "anonymousUser", type: "object", label: "Anonymous user" },
    { key: "phoneUser", type: "object", label: "Phone user" },
  ],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    return client.request(`/${input.name}`);
  },
};

export default getParticipant;
