import type { ActionDefinition } from "@w6w/types";
import { encodeId, KudosityClient } from "../lib/client.ts";

/** `GET /v2/rcs/messages/{id}` — an RCS message with its status and events. */
interface Input {
  id: string;
}

const rcsGet: ActionDefinition<Input> = {
  key: "rcs-get",
  type: "read",
  resource: "rcs",
  title: "Get RCS Message",
  description: "Retrieve an RCS message with its status by id.",
  params: [{ key: "id", label: "Message ID", type: "string", required: true, hint: "A UUID." }],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "sender", type: "string", label: "Sender (RCS agent)" },
    { key: "recipient", type: "string", label: "Recipient" },
    { key: "content", type: "object", label: "Content" },
  ],

  async execute(input, ctx) {
    const { data } = await new KudosityClient(ctx).data(`/rcs/messages/${encodeId(input.id)}`);
    return data as Record<string, unknown>;
  },
};

export default rcsGet;
