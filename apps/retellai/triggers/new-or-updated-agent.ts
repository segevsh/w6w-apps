import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listAgents from "../actions/list-agents.ts";

export default pollFromListAction({
  key: "new-or-updated-agent",
  title: "New or Updated Agent",
  description: "The run gets each newly created or updated agent.",
  action: listAgents,
  input: () => ({ limit: 100, sortOrder: "descending" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const agent = item as { agent_id?: unknown; user_modified_timestamp?: unknown };
    return `${agent.agent_id ?? ""}:${agent.user_modified_timestamp ?? ""}`;
  },
  output: [{ key: "agent_id", type: "string", label: "Agent ID" }],
  sample: { agent_id: "agent-1", user_modified_timestamp: 1731153600000 },
  maxPages: 1,
});
