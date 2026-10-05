import type { ActionDefinition } from "@w6w/types";
import { encodeId, FellowClient } from "../lib/client.ts";
import { ON_BEHALF_OF } from "../lib/params.ts";

interface Input {
  recordingId: string;
  onBehalfOf?: string;
}

const recordingDelete: ActionDefinition<Input> = {
  key: "recording-delete",
  type: "perform",
  resource: "recording",
  title: "Delete Recording",
  description:
    "Permanently delete a recording. Requires a Super Admin key; deleting a recording does not delete its note.",
  idempotent: false,
  params: [
    {
      key: "recordingId",
      label: "Recording ID",
      type: "string",
      required: true,
      hint: "The recording to delete. Permanent and unrecoverable.",
    },
    ON_BEHALF_OF,
  ],
  output: [
    { key: "message", type: "string", label: "Confirmation message" },
  ],

  execute(input, ctx) {
    return new FellowClient(ctx).request(`/recording/${encodeId(input.recordingId)}`, {
      method: "DELETE",
      onBehalfOf: input.onBehalfOf,
    });
  },
};

export default recordingDelete;
