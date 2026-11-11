import { webhookTrigger } from "../lib/triggers.ts";

/** An issue label created, updated or removed. */
const issueLabel = webhookTrigger({
  key: "issue-label",
  title: "Label Event",
  description:
    "Fires when an issue label is created, updated or removed. The run gets the action, the label and, on an update, the values that changed.",
  resourceType: "IssueLabel",
  output: [
    { key: "data.name", type: "string", label: "Name" },
    { key: "data.color", type: "string", label: "Color" },
    { key: "data.teamId", type: "string", label: "Team ID" },
  ],
  sampleData: {
    id: "8d2e4f6a-1b3c-4d5e-9f70-a1b2c3d4e5f6",
    name: "Bug",
    color: "#eb5757",
    teamId: "72b2a2dc-6f4f-4423-9d34-24b5bd10634a",
  },
});

export default issueLabel;
