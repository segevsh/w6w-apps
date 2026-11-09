import { webhookTrigger } from "../lib/triggers.ts";

const pullRequestUpdated = webhookTrigger({
  key: "pull-request-updated",
  title: "Pull Request Updated",
  description:
    "Fires when a pull request is updated (new commits, edited title or description). The run gets the pull request.",
  event: "pullrequest:updated",
  output: [
    { key: "payload.pullrequest", type: "object", label: "Pull request" },
    { key: "payload.pullrequest.id", type: "number", label: "Pull request number" },
    { key: "payload.pullrequest.title", type: "string", label: "Title" },
  ],
  samplePayload: {
    pullrequest: { id: 1, title: "Add a greeting (v2)", state: "OPEN" },
    repository: { full_name: "teamsinspace/documentation-tests" },
    actor: { display_name: "Emma" },
  },
});

export default pullRequestUpdated;
