import type { ActionDefinition } from "@w6w/types";
import { DixaClient, encodeId } from "../lib/client.ts";

interface Input {
  agentId: string;
}

const agentGet: ActionDefinition<Input> = {
  key: "agent-get",
  type: "read",
  resource: "agent",
  title: "Get Agent",
  description: "Fetch one agent or admin by id.",
  params: [{ key: "agentId", label: "Agent id", type: "string", required: true }],
  output: [{ key: "data", type: "object", label: "The agent" }],

  execute(input, ctx) {
    return new DixaClient(ctx).json(`/agents/${encodeId(input.agentId, "agentId")}`);
  },
};

export default agentGet;
