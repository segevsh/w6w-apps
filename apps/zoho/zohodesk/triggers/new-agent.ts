import { snapshotTrigger } from "../lib/snapshot.ts";
import action from "../actions/agent-list.ts";
import { dataOf, idOf, ORG_PARAM } from "../lib/triggers.ts";

/**
 * `GET /agents` (https://desk.zoho.com/DeskAPIDocument#Agents, 2026-11-10): an organization's agents
 * are a short list with no documented creation order, so each check reads the first 100 and diffs
 * the agent ids against the previous one.
 */
export default snapshotTrigger({
  key: "new-agent",
  title: "New Agent",
  description: "The run gets each agent newly added to the Zoho Desk organization.",
  action: action as never,
  params: [ORG_PARAM],
  input: (p) => ({ orgId: p.orgId, from: 1, limit: 100 }),
  items: dataOf,
  idOf,
  output: [
    { key: "id", type: "string", label: "Agent ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "emailId", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: {
    id: "1892000000056007",
    name: "Jane Agent",
    emailId: "jane@example.com",
    status: "ACTIVE",
  },
});
