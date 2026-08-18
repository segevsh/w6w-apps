import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient, compact } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /{org}/{project}/_apis/git/repositories/{id}/pullRequests/{n}/threads`
 * — leave a comment.
 *
 * ## A comment is a thread, and the nesting is the whole model
 *
 * Azure DevOps has no bare comments. Every comment lives in a **thread**, and
 * creating one creates the thread with its first comment inside. That is why
 * this posts a `comments` array rather than a string.
 *
 * ## Where a thread is attached changes what it means
 *
 * Without a file, the thread appears in the pull request's overview — the right
 * place for a build result or a policy note. With `filePath` and a line, it
 * appears **on the diff**, anchored to that line, which is where a review
 * comment belongs and where a linter's output is actually useful.
 *
 * A thread on the overview saying "line 42 of foo.ts is wrong" is a worse
 * version of the same information.
 *
 * ## Status decides whether it blocks
 *
 * `active` is an open comment somebody must resolve; `closed` and `fixed` are
 * resolved. On a repository whose policy requires all comments resolved,
 * **an automated `active` comment blocks the merge** — which is exactly what a
 * failing check should do and exactly what an informational note should not.
 */
const action: ActionDefinition = {
  key: "pull-request-thread-create",
  type: "perform",
  resource: "pull-request",
  title: "Comment on a pull request",
  description:
    "Start a comment thread — on the overview, or anchored to a line of the diff. An `active` " +
    "thread blocks the merge where policy requires comments resolved.",
  idempotent: false,
  params: [
    PROJECT_PARAM,
    { key: "repository", label: "Repository", type: "string", required: true, default: "" },
    { key: "pullRequestId", label: "Pull Request ID", type: "string", required: true, default: "" },
    { key: "comment", label: "Comment", type: "text", required: true, default: "" },
    {
      key: "filePath",
      label: "File Path",
      type: "string",
      default: "",
      placeholder: "/src/index.ts",
      hint: "Anchors the thread to the diff. Without it the thread appears in the overview, " +
        "which is right for a build result and wrong for a review comment.",
    },
    {
      key: "line",
      label: "Line",
      type: "number",
      default: 0,
      showIf: { "!=": [{ var: "filePath" }, ""] },
      hint: "The line in the file's right-hand (new) side.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "active",
      options: [
        { value: "active", label: "Active — someone must resolve it" },
        { value: "closed", label: "Closed — informational" },
        { value: "fixed", label: "Fixed" },
        { value: "pending", label: "Pending" },
      ],
      hint: "Active blocks the merge where policy requires comments resolved. Use closed for a " +
        "note nobody needs to action.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Thread ID" },
    { key: "status", type: "string", label: "Thread status" },
    { key: "onDiff", type: "boolean", label: "Anchored to a line rather than the overview" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    const repository = String(p.repository ?? "").trim();
    const pullRequestId = String(p.pullRequestId ?? "").trim();
    const comment = String(p.comment ?? "").trim();
    if (!project) throw new Error("`project` is required");
    if (!repository) throw new Error("`repository` is required");
    if (!pullRequestId) throw new Error("`pullRequestId` is required");
    if (!comment) throw new Error("`comment` is required");

    const filePath = String(p.filePath ?? "").trim();
    const line = Number(p.line ?? 0);
    const threadContext = filePath
      ? compact({
        filePath,
        rightFileStart: line > 0 ? { line, offset: 1 } : undefined,
        rightFileEnd: line > 0 ? { line, offset: 1 } : undefined,
      })
      : undefined;

    const client = new AzureDevOpsClient(ctx);
    const thread = await client.request<{ id?: number }>(
      client.path(
        project,
        "_apis/git/repositories",
        repository,
        "pullRequests",
        pullRequestId,
        "threads",
      ),
      {
        method: "POST",
        body: compact({
          // Azure DevOps has no bare comments — a comment is a thread's first entry.
          comments: [{ parentCommentId: 0, content: comment, commentType: "text" }],
          status: p.status === undefined ? "active" : String(p.status),
          threadContext,
        }),
      },
    );

    // The ids, never the comment — it is the caller's content.
    ctx.log("info", "commented on an Azure DevOps pull request", {
      pullRequestId,
      threadId: thread?.id,
      onDiff: Boolean(threadContext),
    });
    return { ...thread, onDiff: Boolean(threadContext) };
  },
};

export default action;
