import { webhookTrigger } from "../lib/triggers.ts";

/** `pullrequest:changes_request_created` (https://support.atlassian.com/bitbucket-cloud/docs/event-payloads/, verified 2026-11-10). */
const pullRequestChangesRequested = webhookTrigger({
  key: "pull-request-changes-requested",
  title: "Pull Request Changes Requested",
  description:
    "Fires when a reviewer requests changes on a pull request. The run gets the pull request and the request.",
  event: "pullrequest:changes_request_created",
  output: [
    { key: "payload.pullrequest", type: "object", label: "Pull request" },
    { key: "payload.changes_request", type: "object", label: "Changes request" },
  ],
  samplePayload: {
    pullrequest: { id: 7, title: "Add feature", state: "OPEN" },
    changes_request: { date: "2026-11-10T09:30:00.000000+00:00", user: { display_name: "Emma" } },
    repository: { full_name: "teamsinspace/documentation-tests" },
    actor: { display_name: "Emma" },
  },
});

export default pullRequestChangesRequested;
