import { webhookTrigger } from "../lib/triggers.ts";

/** `issue:updated` (https://support.atlassian.com/bitbucket-cloud/docs/event-payloads/, verified 2026-11-10). */
const issueUpdated = webhookTrigger({
  key: "issue-updated",
  title: "Issue Updated",
  description:
    "Fires when an issue in the repository issue tracker is updated. The run gets the issue and what changed.",
  event: "issue:updated",
  output: [
    { key: "payload.issue", type: "object", label: "Issue" },
    { key: "payload.changes", type: "object", label: "Changes" },
  ],
  samplePayload: {
    issue: { id: 3, title: "Found a bug", state: "open", priority: "major" },
    changes: { state: { old: "new", new: "open" } },
    repository: { full_name: "teamsinspace/documentation-tests" },
    actor: { display_name: "Emma" },
  },
});

export default issueUpdated;
