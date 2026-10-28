import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /{org}/{project}/_apis/git/pullrequests/{id}` — one pull request,
 * without needing to know its repository.
 *
 * That is the reason this uses the **project-level** path rather than the
 * repository one: a pull request id is unique within the project, so a workflow
 * reacting to a webhook or a comment has everything it needs from the id alone.
 *
 * ## Reviewer votes are numbers, and they are not ordered how you would guess
 *
 * `10` approved, `5` approved with suggestions, `0` no vote, `-5` waiting for
 * the author, **`-10` rejected**. A workflow summing or averaging them produces
 * nonsense; the only safe reading is equality. This action counts the votes
 * rather than leaving that arithmetic to a caller.
 *
 * `mergeStatus` is separate from whether anybody approved: a pull request can
 * be approved by everyone and unmergeable because of a conflict, and the two
 * fields never mention each other.
 */
const VOTES: Record<string, string> = {
  "10": "approved",
  "5": "approvedWithSuggestions",
  "0": "noVote",
  "-5": "waitingForAuthor",
  "-10": "rejected",
};

const action: ActionDefinition = {
  key: "pull-request-get",
  type: "read",
  resource: "pull-request",
  title: "Get a pull request",
  description:
    "One pull request by id alone — no repository needed. Reviewer votes are numbers where -10 " +
    "is a rejection, so they can only be compared, never summed.",
  params: [
    PROJECT_PARAM,
    {
      key: "pullRequestId",
      label: "Pull Request ID",
      type: "string",
      required: true,
      default: "",
      hint: "Unique within the project, so the repository is not needed.",
    },
  ],
  output: [
    { key: "pullRequestId", type: "number", label: "Pull Request ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "active, completed or abandoned" },
    { key: "mergeStatus", type: "string", label: "Whether it CAN merge — separate from approval" },
    { key: "isDraft", type: "boolean", label: "Draft" },
    { key: "voteCounts", type: "object", label: "How many reviewers voted each way" },
    { key: "rejected", type: "boolean", label: "At least one reviewer rejected it" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    const pullRequestId = String(p.pullRequestId ?? "").trim();
    if (!project) throw new Error("`project` is required");
    if (!pullRequestId) throw new Error("`pullRequestId` is required");

    const client = new AzureDevOpsClient(ctx);
    const pr = await client.request<{ reviewers?: Array<{ vote?: number }> }>(
      client.path(project, "_apis/git/pullrequests", pullRequestId),
    );

    // The votes are an enum wearing a number's clothes.
    const voteCounts: Record<string, number> = {};
    for (const reviewer of pr?.reviewers ?? []) {
      const name = VOTES[String(reviewer?.vote ?? 0)] ?? "unknown";
      voteCounts[name] = (voteCounts[name] ?? 0) + 1;
    }

    return { ...pr, voteCounts, rejected: (voteCounts["rejected"] ?? 0) > 0 };
  },
};

export default action;
