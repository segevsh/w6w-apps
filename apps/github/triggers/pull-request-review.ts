import { webhookTrigger } from "../lib/triggers.ts";

/** A review on a pull request. */
const pullRequestReview = webhookTrigger({
  key: "pull-request-review",
  title: "Pull Request Review Event",
  description:
    "Fires on pull request reviews (submitted, edited, dismissed). The run gets the action, the review and the pull request.",
  event: "pull_request_review",
  hasActions: true,
  output: [
    { key: "payload.review", type: "object", label: "Review" },
    { key: "payload.review.state", type: "string", label: "Review state" },
    { key: "payload.pull_request", type: "object", label: "Pull request" },
    { key: "payload.pull_request.number", type: "number", label: "Pull request number" },
  ],
  samplePayload: {
    action: "submitted",
    review: { id: 80, state: "approved", body: "Looks good", user: { login: "octocat" } },
    pull_request: { number: 1347, title: "Amazing new feature", state: "open" },
    repository: { full_name: "octocat/Hello-World" },
    sender: { login: "octocat" },
  },
});

export default pullRequestReview;
