import { webhookTrigger } from "../lib/triggers.ts";

/** A comment on a pull request diff. */
const pullRequestReviewComment = webhookTrigger({
  key: "pull-request-review-comment",
  title: "Pull Request Review Comment Event",
  description:
    "Fires on comments on a pull request diff (created, edited, deleted). The run gets the action, the comment and the pull request.",
  event: "pull_request_review_comment",
  hasActions: true,
  output: [
    { key: "payload.comment", type: "object", label: "Comment" },
    { key: "payload.comment.body", type: "string", label: "Comment text" },
    { key: "payload.pull_request", type: "object", label: "Pull request" },
    { key: "payload.pull_request.number", type: "number", label: "Pull request number" },
  ],
  samplePayload: {
    action: "created",
    comment: { id: 10, body: "Nit: rename this", path: "src/index.ts", user: { login: "octocat" } },
    pull_request: { number: 1347, title: "Amazing new feature", state: "open" },
    repository: { full_name: "octocat/Hello-World" },
    sender: { login: "octocat" },
  },
});

export default pullRequestReviewComment;
