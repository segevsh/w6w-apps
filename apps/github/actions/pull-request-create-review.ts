import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath, unset } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  pullRequestNumber: number;
  event: string;
  body?: string;
  commitId?: string;
  comments?: unknown;
}

const pullRequestCreateReview: ActionDefinition<Input> = {
  key: "pull-request-create-review",
  type: "perform",
  resource: "pullRequest",
  title: "Create Pull Request Review",
  description: "Submit a review — approve, request changes, or leave a comment-only review.",
  idempotent: false,
  params: [
    owner,
    repository,
    { key: "pullRequestNumber", label: "PR number", type: "number", required: true },
    {
      key: "event",
      label: "Event",
      type: "select",
      required: true,
      default: "COMMENT",
      options: [
        { value: "APPROVE", label: "Approve" },
        { value: "REQUEST_CHANGES", label: "Request changes" },
        { value: "COMMENT", label: "Comment" },
        { value: "PENDING", label: "Save as pending (not submitted)" },
      ],
    },
    {
      key: "body",
      label: "Body",
      type: "text",
      config: { multiline: true },
      hint: "Required for Request changes and Comment.",
    },
    {
      key: "commitId",
      label: "Commit SHA",
      type: "string",
      hint: "Review this commit specifically.",
    },
    {
      key: "comments",
      label: "Line comments",
      type: "json",
      hint:
        'Array of { path, line, body } objects anchored to the diff, e.g. [{ "path": "src/a.ts", "line": 12, "body": "typo" }].',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Review ID" },
    { key: "state", type: "string", label: "State" },
    { key: "html_url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    // PENDING is expressed by omitting `event` — sending it verbatim is rejected.
    const event = input.event === "PENDING" ? undefined : input.event;
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/pulls/${input.pullRequestNumber}/reviews`,
      {
        method: "POST",
        body: {
          event,
          body: unset(input.body),
          commit_id: unset(input.commitId),
          comments: input.comments,
        },
      },
    );
  },
};

export default pullRequestCreateReview;
