import type { ActionDefinition } from "@w6w/types";
import { DixaClient } from "../lib/client.ts";

const queueList: ActionDefinition<Record<string, never>> = {
  key: "queue-list",
  type: "search",
  resource: "queue",
  title: "List Queues",
  description: "List the organisation's queues with their routing settings.",
  params: [],
  output: [{ key: "data", type: "array", label: "Queues" }],

  execute(_input, ctx) {
    return new DixaClient(ctx).json("/queues");
  },
};

export default queueList;
