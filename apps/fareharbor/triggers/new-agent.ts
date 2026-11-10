import agentList from "../actions/agent-list.ts";
import { companyParam } from "../lib/params.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

export default snapshotTrigger({
  key: "new-agent",
  title: "New Agent",
  description:
    "The run gets each agent added to the affiliate company since the last check (affiliate keys only).",
  action: agentList,
  params: [companyParam],
  items: (result) => (result as { agents?: unknown[] })?.agents ?? [],
  idOf: (item) => String((item as { pk?: unknown })?.pk ?? ""),
  updated: false,
  output: [
    { key: "pk", type: "number", label: "Agent pk" },
  ],
  sample: { pk: 1 },
});
