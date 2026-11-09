import { webhookTrigger } from "../lib/triggers.ts";

/** A comment on an issue or pull request. */
const issueComment = webhookTrigger({
  key: "issue-comment",
  title: "Issue Comment Event",
  description:
    "Fires when a comment on an issue or pull request is created, edited or deleted. The run gets the action, the comment and the issue.",
  event: "issue_comment",
  hasActions: true,
  output: [
    { key: "payload.comment", type: "object", label: "Comment" },
    { key: "payload.comment.body", type: "string", label: "Comment text" },
    { key: "payload.issue", type: "object", label: "Issue or pull request" },
  ],
  samplePayload: {
    action: "created",
    comment: {
      id: 99262140,
      body: "You are totally right!",
      html_url: "https://github.com/octocat/Hello-World/issues/1347#issuecomment-99262140",
      user: { login: "octocat" },
    },
    issue: { number: 1347, title: "Found a bug" },
    repository: { full_name: "octocat/Hello-World" },
    sender: { login: "octocat" },
  },
});

export default issueComment;
