import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient, query } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /{org}/{project}/_apis/git/repositories/{id}/pullrequests` — the pull
 * requests.
 *
 * ## The filters are prefixed, and `status` defaults to Active
 *
 * Azure DevOps takes these as `searchCriteria.status`,
 * `searchCriteria.targetRefName` and so on — a prefixed flat namespace rather
 * than nested objects. This action takes plain names and adds the prefix,
 * because getting it wrong produces no error: an unrecognised query parameter
 * is **ignored**, and the filter silently does nothing.
 *
 * That combines badly with the default. Unset, `status` is `Active`, so a
 * report that meant to count everything counts only what is open — and a
 * mistyped filter leaves that default in place while looking filtered.
 *
 * ## Branch filters want full refs
 *
 * `targetRefName` is `refs/heads/main`, not `main`. A bare name matches
 * nothing, silently, for the same reason. This action prefixes a bare name
 * rather than passing it through to a quiet empty result.
 */
const action: ActionDefinition = {
  key: "pull-request-list",
  type: "read",
  resource: "pull-request",
  title: "List pull requests",
  description:
    "Pull requests, defaulting to ACTIVE ones. Azure DevOps ignores an unrecognised filter " +
    "rather than rejecting it, so a mistyped one silently returns the default set.",
  params: [
    PROJECT_PARAM,
    { key: "repository", label: "Repository", type: "string", required: true, default: "" },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "active",
      options: [
        { value: "active", label: "Active — open" },
        { value: "completed", label: "Completed — merged" },
        { value: "abandoned", label: "Abandoned" },
        { value: "all", label: "All" },
      ],
    },
    {
      key: "targetBranch",
      label: "Target Branch",
      type: "string",
      default: "",
      hint: "A bare name is fine — it is expanded to `refs/heads/…`, which is what the API " +
        "actually matches on.",
    },
    { key: "sourceBranch", label: "Source Branch", type: "string", default: "" },
    {
      key: "creatorId",
      label: "Creator ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "An identity id, not an email address.",
    },
    { key: "reviewerId", label: "Reviewer ID", type: "string", default: "", advanced: true },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "skip", label: "Skip", type: "number", default: 0, advanced: true },
  ],
  output: [
    { key: "pullRequests", type: "array", label: "Pull requests" },
    { key: "count", type: "number", label: "Pull requests returned" },
    { key: "draftCount", type: "number", label: "Of those, how many are drafts" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    const repository = String(p.repository ?? "").trim();
    if (!project) throw new Error("`project` is required");
    if (!repository) throw new Error("`repository` is required");

    // A bare branch name matches nothing and says nothing about it.
    const ref = (name: unknown) => {
      const text = String(name ?? "").trim();
      if (!text) return undefined;
      return text.startsWith("refs/") ? text : `refs/heads/${text}`;
    };

    const client = new AzureDevOpsClient(ctx);
    const pullRequests = await client.list<{ isDraft?: boolean }>(
      client.path(project, "_apis/git/repositories", repository, "pullrequests"),
      {
        query: query({
          "searchCriteria.status": p.status === undefined ? "active" : String(p.status),
          "searchCriteria.targetRefName": ref(p.targetBranch),
          "searchCriteria.sourceRefName": ref(p.sourceBranch),
          "searchCriteria.creatorId": p.creatorId,
          "searchCriteria.reviewerId": p.reviewerId,
          $top: Math.max(1, Number(p.limit ?? 100)),
          $skip: Number(p.skip ?? 0) || undefined,
        }),
      },
    );

    return {
      pullRequests,
      count: pullRequests.length,
      draftCount: pullRequests.filter((pr) => pr?.isDraft === true).length,
    };
  },
};

export default action;
