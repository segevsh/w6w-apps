import { webhookTrigger } from "../lib/triggers.ts";

/** `issue:comment_created` (https://support.atlassian.com/bitbucket-cloud/docs/event-payloads/, verified 2026-11-10). */
const issueCommentCreated = webhookTrigger({
  key: "issue-comment-created",
  title: "New Issue Comment",
  description: "Fires when a comment is added to an issue. The run gets the issue and the comment.",
  event: "issue:comment_created",
  output: [
    { key: "payload.issue", type: "object", label: "Issue" },
    { key: "payload.comment", type: "object", label: "Comment" },
  ],
  samplePayload: {
    issue: { id: 3, title: "Found a bug" },
    comment: { id: 12, content: { raw: "Reproduced on main." } },
    repository: { full_name: "teamsinspace/documentation-tests" },
    actor: { display_name: "Emma" },
  },
});

export default issueCommentCreated;
