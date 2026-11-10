import { webhookTrigger } from "../lib/triggers.ts";

/** `repo:commit_status_created` (https://support.atlassian.com/bitbucket-cloud/docs/event-payloads/, verified 2026-11-10). */
const commitStatusCreated = webhookTrigger({
  key: "commit-status-created",
  title: "Build Status Created",
  description:
    "Fires when a build status (CI result) is created on a commit. The run gets the commit status.",
  event: "repo:commit_status_created",
  output: [
    { key: "payload.commit_status", type: "object", label: "Commit status" },
  ],
  samplePayload: {
    commit_status: {
      key: "build-1",
      state: "INPROGRESS",
      name: "CI",
      commit: { hash: "709d658dc5b6d6afcd46049c2f332ee3f515a67d" },
    },
    repository: { full_name: "teamsinspace/documentation-tests" },
    actor: { display_name: "Emma" },
  },
});

export default commitStatusCreated;
