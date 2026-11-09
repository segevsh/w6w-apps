import { webhookTrigger } from "../lib/triggers.ts";

const pullRequestMerged = webhookTrigger({
  key: "pull-request-merged",
  title: "Pull Request Merged",
  description:
    "Fires when a pull request is merged. The run gets the pull request and the merge commit.",
  event: "pullrequest:fulfilled",
  output: [
    { key: "payload.pullrequest", type: "object", label: "Pull request" },
    { key: "payload.pullrequest.id", type: "number", label: "Pull request number" },
    { key: "payload.pullrequest.merge_commit.hash", type: "string", label: "Merge commit" },
  ],
  samplePayload: {
    pullrequest: {
      id: 1,
      title: "Add a greeting",
      state: "MERGED",
      merge_commit: { hash: "e5a1b2c3d4e5" },
    },
    repository: { full_name: "teamsinspace/documentation-tests" },
    actor: { display_name: "Emma" },
  },
});

export default pullRequestMerged;
