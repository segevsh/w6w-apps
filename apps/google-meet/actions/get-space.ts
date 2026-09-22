import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `meet.spaces.get` — GET `v2/{+name}`
 * (https://meet.googleapis.com/$discovery/rest?version=v2).
 *
 * `name` accepts either the space's resource name (`spaces/{space}`) or its
 * typeable meeting-code alias (`spaces/{meetingCode}`, e.g.
 * `spaces/abc-mnop-xyz`), which is why the parameter is the raw resource name
 * rather than a bare ID.
 */
const getSpace: ActionDefinition<Input> = {
  key: "get-space",
  type: "read",
  resource: "space",
  title: "Get Space",
  description:
    "Retrieve a space by resource name (`spaces/{space}`) or meeting-code alias (`spaces/{meetingCode}`).",
  params: [
    {
      key: "name",
      label: "Space name",
      type: "string",
      required: true,
      hint: "`spaces/{space}` or the typeable alias `spaces/{meetingCode}`.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Space name" },
    { key: "meetingUri", type: "string", label: "Meeting URI" },
    { key: "meetingCode", type: "string", label: "Meeting code" },
    { key: "config", type: "object", label: "Space configuration" },
    { key: "activeConference", type: "object", label: "Active conference" },
    { key: "phoneAccess", type: "array", label: "Phone access" },
    { key: "gatewaySipAccess", type: "array", label: "Gateway SIP access" },
  ],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    return client.request(`/${input.name}`);
  },
};

export default getSpace;
