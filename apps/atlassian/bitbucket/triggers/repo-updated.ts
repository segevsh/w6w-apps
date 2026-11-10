import { webhookTrigger } from "../lib/triggers.ts";

/** `repo:updated` (https://support.atlassian.com/bitbucket-cloud/docs/event-payloads/, verified 2026-11-10). */
const repoUpdated = webhookTrigger({
  key: "repo-updated",
  title: "Repository Updated",
  description:
    "Fires when the repository's settings change (name, description, privacy, main branch). The run gets the repository and the changes.",
  event: "repo:updated",
  output: [
    { key: "payload.changes", type: "object", label: "Changes" },
  ],
  samplePayload: {
    changes: { description: { old: "", new: "Docs tests" } },
    repository: { full_name: "teamsinspace/documentation-tests" },
    actor: { display_name: "Emma" },
  },
});

export default repoUpdated;
