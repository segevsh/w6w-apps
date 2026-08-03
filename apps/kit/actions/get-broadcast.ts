import type { ActionDefinition } from "@w6w/types";
import { KitClient } from "../lib/client.ts";

interface Input {
  broadcastId: number;
}

const getBroadcast: ActionDefinition<Input> = {
  key: "get-broadcast",
  type: "read",
  resource: "broadcast",
  title: "Get Broadcast",
  description:
    "Return one broadcast's full record: subject, HTML content, preview text, targeting, email template, send schedule and web-publishing details. Engagement stats are not included.",
  params: [
    { key: "broadcastId", label: "Broadcast ID", type: "number", required: true },
  ],
  output: [{ key: "broadcast", type: "object", label: "Broadcast" }],

  execute(input, ctx) {
    return new KitClient(ctx).request(`/broadcasts/${input.broadcastId}`);
  },
};

export default getBroadcast;
