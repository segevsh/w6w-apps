import type { ActionDefinition } from "@w6w/types";
import { encodeId, FellowClient } from "../lib/client.ts";
import { ON_BEHALF_OF } from "../lib/params.ts";

interface Input {
  recordingId: string;
  onBehalfOf?: string;
}

const uploadGet: ActionDefinition<Input> = {
  key: "upload-get",
  type: "read",
  resource: "recording",
  title: "Get Upload Status",
  description:
    "Retrieve one API-uploaded recording with its import status (PENDING, SUCCESS or FAILED) and failure reason.",
  params: [
    {
      key: "recordingId",
      label: "Recording ID",
      type: "string",
      required: true,
      hint: "The `recording_id` returned by Upload Recording From URL.",
    },
    ON_BEHALF_OF,
  ],
  output: [
    { key: "recording_id", type: "string", label: "Recording id" },
    { key: "status", type: "string", label: "PENDING, SUCCESS or FAILED" },
    { key: "failure_reason", type: "string", label: "Why the import failed, if it did" },
    { key: "title", type: "string", label: "Title" },
  ],

  execute(input, ctx) {
    return new FellowClient(ctx).unwrap(
      "upload",
      `/recordings/upload/${encodeId(input.recordingId)}`,
      {
        onBehalfOf: input.onBehalfOf,
      },
    );
  },
};

export default uploadGet;
