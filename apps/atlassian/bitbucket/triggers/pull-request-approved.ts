import { webhookTrigger } from "../lib/triggers.ts";

/** `pullrequest:approved` (https://support.atlassian.com/bitbucket-cloud/docs/event-payloads/, verified 2026-11-10). */
const pullRequestApproved = webhookTrigger({
  key: "pull-request-approved",
  title: "Pull Request Approved",
  description:
    "Fires when a pull request is approved by a reviewer. The run gets the pull request and the approval.",
  event: "pullrequest:approved",
  output: [
    { key: "payload.pullrequest", type: "object", label: "Pull request" },
    { key: "payload.approval", type: "object", label: "Approval" },
  ],
  samplePayload: {
    pullrequest: { id: 7, title: "Add feature", state: "OPEN" },
    approval: { date: "2026-11-10T09:30:00.000000+00:00", user: { display_name: "Emma" } },
    repository: { full_name: "teamsinspace/documentation-tests" },
    actor: { display_name: "Emma" },
  },
});

export default pullRequestApproved;
