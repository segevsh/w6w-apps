import { webhookTrigger } from "../lib/triggers.ts";

/** `repo:commit_status_updated` (https://support.atlassian.com/bitbucket-cloud/docs/event-payloads/, verified 2026-11-10). */
const commitStatusUpdated = webhookTrigger({
  key: "commit-status-updated",
  title: "Build Status Updated",
  description:
    "Fires when a build status (CI result) on a commit changes, for example to SUCCESSFUL or FAILED. The run gets the commit status.",
  event: "repo:commit_status_updated",
  output: [
    { key: "payload.commit_status", type: "object", label: "Commit status" },
  ],
  samplePayload: {
    commit_status: {
      key: "build-1",
      state: "SUCCESSFUL",
      name: "CI",
      commit: { hash: "709d658dc5b6d6afcd46049c2f332ee3f515a67d" },
    },
    repository: { full_name: "teamsinspace/documentation-tests" },
    actor: { display_name: "Emma" },
  },
});

export default commitStatusUpdated;
