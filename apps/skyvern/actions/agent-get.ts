import type { ActionDefinition } from "@w6w/types";
import { compact, SkyvernClient } from "../lib/client.ts";

/** `GET /v1/agents/{workflow_permanent_id}` — one agent, latest version unless pinned. */
interface Input {
  agentId: string;
  version?: number;
}

const agentGet: ActionDefinition<Input> = {
  key: "agent-get",
  type: "read",
  resource: "agent",
  title: "Get Agent",
  description: "Fetch a saved agent, including its block definition and parameters.",
  params: [
    {
      key: "agentId",
      label: "Agent ID",
      type: "string",
      required: true,
      hint: "The agent's permanent id (`wpid_…`).",
    },
    {
      key: "version",
      label: "Version",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "A specific version. Empty returns the latest.",
    },
  ],
  output: [
    { key: "workflow_permanent_id", type: "string", label: "Agent ID (wpid_…)" },
    { key: "title", type: "string", label: "Title" },
    { key: "version", type: "number", label: "Version" },
    { key: "status", type: "string", label: "Status" },
    { key: "workflow_definition", type: "object", label: "Definition (parameters and blocks)" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "modified_at", type: "string", label: "Modified at" },
  ],

  execute(input, ctx) {
    return new SkyvernClient(ctx).json(`/v1/agents/${encodeURIComponent(input.agentId)}`, {
      query: compact({ version: input.version }),
    });
  },
};

export default agentGet;
