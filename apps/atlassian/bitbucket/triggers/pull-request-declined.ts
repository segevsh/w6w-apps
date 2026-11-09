import { webhookTrigger } from "../lib/triggers.ts";

const pullRequestDeclined = webhookTrigger({
  key: "pull-request-declined",
  title: "Pull Request Declined",
  description:
    "Fires when a pull request is declined. The run gets the pull request and the reason.",
  event: "pullrequest:rejected",
  output: [
    { key: "payload.pullrequest", type: "object", label: "Pull request" },
    { key: "payload.pullrequest.id", type: "number", label: "Pull request number" },
    { key: "payload.pullrequest.reason", type: "string", label: "Reason" },
  ],
  samplePayload: {
    pullrequest: { id: 1, title: "Add a greeting", state: "DECLINED", reason: "Superseded by #2" },
    repository: { full_name: "teamsinspace/documentation-tests" },
    actor: { display_name: "Emma" },
  },
});

export default pullRequestDeclined;
