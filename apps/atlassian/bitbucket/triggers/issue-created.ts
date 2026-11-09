import { webhookTrigger } from "../lib/triggers.ts";

const issueCreated = webhookTrigger({
  key: "issue-created",
  title: "New Issue",
  description:
    "Fires when an issue is created in the repository issue tracker. The run gets the issue.",
  event: "issue:created",
  output: [
    { key: "payload.issue", type: "object", label: "Issue" },
    { key: "payload.issue.id", type: "number", label: "Issue number" },
    { key: "payload.issue.title", type: "string", label: "Title" },
  ],
  samplePayload: {
    issue: { id: 3, title: "Found a bug", state: "new", priority: "major" },
    repository: { full_name: "teamsinspace/documentation-tests" },
    actor: { display_name: "Emma" },
  },
});

export default issueCreated;
