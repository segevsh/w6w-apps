import { pollFromListAction } from "../../_shared/poll/mod.ts";
import agentList from "../actions/agent-list.ts";

export default pollFromListAction({
  key: "new-agent",
  title: "New Agent",
  description: "The run gets each newly created agent.",
  action: agentList,
  input: () => ({ page: 1, pageSize: 100, sort: ["-insert_date_"] }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { agent_id?: unknown }).agent_id ?? ""),
  output: [{ key: "agent_id", type: "string", label: "Agent ID" }],
  sample: { agent_id: "agent-1" },
  maxPages: 1,
});
