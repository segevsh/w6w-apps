import type { ActionDefinition } from "@w6w/types";
import { DixaClient, encodeId } from "../lib/client.ts";

interface Input {
  queueId: string;
}

const queueGet: ActionDefinition<Input> = {
  key: "queue-get",
  type: "read",
  resource: "queue",
  title: "Get Queue",
  description: "Fetch one queue by id.",
  params: [{ key: "queueId", label: "Queue id", type: "string", required: true }],
  output: [{ key: "data", type: "object", label: "The queue" }],

  execute(input, ctx) {
    return new DixaClient(ctx).json(`/queues/${encodeId(input.queueId, "queueId")}`);
  },
};

export default queueGet;
