import { webhookTrigger } from "../lib/triggers.ts";

/** An issue created, updated or removed. */
const issue = webhookTrigger({
  key: "issue",
  title: "Issue Event",
  description:
    "Fires when an issue is created, updated or removed. The run gets the action, the issue and, on an update, the values that changed.",
  resourceType: "Issue",
  output: [
    { key: "data.identifier", type: "string", label: "Issue identifier" },
    { key: "data.title", type: "string", label: "Title" },
    { key: "data.priority", type: "number", label: "Priority" },
    { key: "data.state", type: "object", label: "Workflow state" },
    { key: "data.assignee", type: "object", label: "Assignee" },
    { key: "data.team", type: "object", label: "Team" },
  ],
  sampleData: {
    id: "2174add1-f7c8-44e3-bbf3-2d60b5ea8bc9",
    identifier: "ENG-42",
    title: "Webhook deliveries drop on retry",
    priority: 2,
    state: { id: "9c8b7a65-4321-4fed-a987-6543210fedcb", name: "Todo", type: "unstarted" },
    assignee: { id: "b5ea5f1f-8adc-4f52-b4bd-ab4e84cf51ba", name: "Linear Orbit" },
    team: { id: "72b2a2dc-6f4f-4423-9d34-24b5bd10634a", key: "ENG", name: "Engineering" },
  },
});

export default issue;
