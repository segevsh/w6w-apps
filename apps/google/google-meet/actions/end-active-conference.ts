import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `meet.spaces.endActiveConference` — POST `v2/{+name}:endActiveConference`
 * (https://meet.googleapis.com/$discovery/rest?version=v2).
 *
 * Ends the space's live conference, if one is running. The custom-method colon
 * (`:endActiveConference`) is part of the path, the request body is empty
 * (`EndActiveConferenceRequest` declares no fields), and the response is an
 * empty `Empty` object. Ending an already-idle space is a no-op, so the action
 * is idempotent.
 */
const endActiveConference: ActionDefinition<Input> = {
  key: "end-active-conference",
  type: "perform",
  resource: "space",
  title: "End Active Conference",
  description:
    "End the space's currently active conference, if any. A no-op when the space is idle.",
  idempotent: true,
  params: [
    {
      key: "name",
      label: "Space name",
      type: "string",
      required: true,
      hint: "`spaces/{space}` — the space whose live conference should end.",
    },
  ],
  output: [],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    return client.request(`/${input.name}:endActiveConference`, { method: "POST" });
  },
};

export default endActiveConference;
