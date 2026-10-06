import type { ActionDefinition } from "@w6w/types";
import { RecallClient, seg } from "../lib/client.ts";
import { idParam, RECORDING_OUTPUT } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /api/v1/recording/{id}/`. */
const action: ActionDefinition<Input> = {
  key: "recording-get",
  type: "read",
  resource: "recording",
  title: "Get Recording",
  description:
    "Retrieve a recording and its media shortcuts (mixed video and audio, transcript, participant events, meeting metadata).",
  params: [idParam("Recording ID")],
  output: RECORDING_OUTPUT,

  execute(input, ctx) {
    return new RecallClient(ctx).request("GET", `/api/v1/recording/${seg(input.id)}/`);
  },
};

export default action;
