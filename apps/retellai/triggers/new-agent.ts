import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listAgents from "../actions/list-agents.ts";

export default pollFromListAction({
  key: "new-agent",
  title: "New Agent",
  description: "The run gets each newly created agent.",
  action: listAgents,
  input: () => ({ limit: 100, sortOrder: "descending" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { agent_id?: unknown }).agent_id ?? ""),
  output: [{ key: "agent_id", type: "string", label: "Agent ID" }],
  sample: { agent_id: "agent-1" },
  maxPages: 1,
});
