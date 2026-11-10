import { webhookTrigger } from "../lib/triggers.ts";

const pullRequestComment = webhookTrigger({
  key: "pull-request-comment",
  title: "New Pull Request Comment",
  description:
    "Fires when a comment is added to a pull request. The run gets the comment and the pull request.",
  event: "pullrequest:comment_created",
  output: [
    { key: "payload.comment", type: "object", label: "Comment" },
    { key: "payload.comment.content.raw", type: "string", label: "Comment text" },
    { key: "payload.pullrequest", type: "object", label: "Pull request" },
  ],
  samplePayload: {
    comment: { id: 17, content: { raw: "Looks good to me." } },
    pullrequest: { id: 1, title: "Add a greeting" },
    repository: { full_name: "teamsinspace/documentation-tests" },
    actor: { display_name: "Emma" },
  },
});

export default pullRequestComment;
