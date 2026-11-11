import { webhookTrigger } from "../lib/triggers.ts";

/**
 * Any Bitbucket repository event. The `events` param (comma-separated event keys, empty = all 24
 * documented keys) is the list the webhook is registered for, and deliveries of any other key are
 * acknowledged without a run. https://support.atlassian.com/bitbucket-cloud/docs/event-payloads/
 * (verified 2026-11-10)
 */
const anyEvent = webhookTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on the Bitbucket repository events you choose (repo:push, repo:fork, repo:updated, issue:*, pullrequest:*, repo:commit_status_*; all documented keys when empty). The run gets the event key, the delivery id, the repository, the actor and the full payload.",
  output: [
    { key: "payload.push", type: "object", label: "Push (repo:push)" },
    { key: "payload.pullrequest", type: "object", label: "Pull request (pullrequest:*)" },
    { key: "payload.issue", type: "object", label: "Issue (issue:*)" },
  ],
  samplePayload: {
    pullrequest: { id: 7, title: "Add feature", state: "OPEN" },
    repository: { full_name: "teamsinspace/documentation-tests" },
    actor: { display_name: "Emma" },
  },
});

export default anyEvent;
