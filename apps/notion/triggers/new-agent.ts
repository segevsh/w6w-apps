import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/query-agents.ts";

const trigger = pollFromListAction({
  key: "new-agent",
  title: "New Agent",
  description:
    "The run gets each Custom Agent newly visible to the connection, checked by created time, newest first.",
  action,
  input: () => ({ sorts: [{ property: "created_time", direction: "descending" }], pageSize: 25 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Agent ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "agent_type", type: "string", label: "Agent type" },
    { key: "created_time", type: "string", label: "Created time" },
  ],
  sample: {
    "object": "agent",
    "id": "7f3c1a52-0d1e-4b6a-9a77-1c2d3e4f5a6b",
    "name": "Triage agent",
    "agent_type": "custom_agent",
    "created_time": "2026-11-01T09:00:00.000Z",
  },
  maxPages: 1,
});

export default trigger;
