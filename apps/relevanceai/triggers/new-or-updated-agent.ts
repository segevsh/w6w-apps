import { pollFromListAction } from "../../_shared/poll/mod.ts";
import agentList from "../actions/agent-list.ts";

export default pollFromListAction({
  key: "new-or-updated-agent",
  title: "New or Updated Agent",
  description: "The run gets each newly created or updated agent.",
  action: agentList,
  input: () => ({ page: 1, pageSize: 100, sort: [{ update_date_: "desc" }] }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => {
    const agent = item as { agent_id?: unknown; update_date_?: unknown };
    return `${agent.agent_id ?? ""}:${agent.update_date_ ?? ""}`;
  },
  output: [{ key: "agent_id", type: "string", label: "Agent ID" }],
  sample: { agent_id: "agent-1", update_date_: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
