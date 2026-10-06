import type { ActionDefinition } from "@w6w/types";
import { encodeId, KudosityClient } from "../lib/client.ts";

/** `GET /v2/mms/{id}` — one MMS by id. */
interface Input {
  id: string;
}

const mmsGet: ActionDefinition<Input> = {
  key: "mms-get",
  type: "read",
  resource: "mms",
  title: "Get MMS",
  description: "Retrieve an MMS message and its status by id.",
  params: [{ key: "id", label: "Message ID", type: "string", required: true, hint: "A UUID." }],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "recipient", type: "string", label: "Recipient" },
    { key: "sender", type: "string", label: "Sender" },
    { key: "content_urls", type: "array", label: "Content URLs" },
  ],

  async execute(input, ctx) {
    return await new KudosityClient(ctx).json(`/mms/${encodeId(input.id)}`);
  },
};

export default mmsGet;
