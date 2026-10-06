import type { ActionDefinition } from "@w6w/types";
import { RecallClient, seg } from "../lib/client.ts";
import { idParam, TRANSCRIPT_OUTPUT } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /api/v1/transcript/{id}/`. */
const action: ActionDefinition<Input> = {
  key: "transcript-get",
  type: "read",
  resource: "transcript",
  title: "Get Transcript",
  description:
    "Retrieve a transcript. When its status code is `done`, `data.download_url` is a pre-signed link to the transcript JSON.",
  params: [idParam("Transcript ID")],
  output: TRANSCRIPT_OUTPUT,

  execute(input, ctx) {
    return new RecallClient(ctx).request("GET", `/api/v1/transcript/${seg(input.id)}/`);
  },
};

export default action;
