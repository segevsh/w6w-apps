import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient, compact, csv } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /{org}/{project}/_apis/git/repositories/{id}/pullrequests` — open a
 * pull request.
 *
 * ## Branches are full refs, and a bare name fails
 *
 * `sourceRefName` and `targetRefName` are `refs/heads/…`. Unlike the search
 * filters — which ignore an unrecognised value — creation **rejects** a bare
 * name, which is at least loud. This action expands bare names either way, so
 * the same input works in both places.
 *
 * ## Draft is the safer default for an automated pull request
 *
 * A non-draft pull request notifies its reviewers immediately and, on a repo
 * with build validation, starts a pipeline. For a workflow opening pull
 * requests unattended — a dependency bump, a generated migration — that is a
 * notification and a build per run.
 *
 * Azure DevOps defaults to non-draft; this action defaults to **draft** and
 * says why. Publishing is a separate deliberate step.
 *
 * ## Reviewers are identity ids
 *
 * Not email addresses and not display names. Passing an address is rejected,
 * which is the good outcome — the bad one would be creating the pull request
 * with no reviewers and looking successful.
 */
const action: ActionDefinition = {
  key: "pull-request-create",
  type: "perform",
  resource: "pull-request",
  title: "Create a pull request",
  description:
    "Open a pull request. Defaults to DRAFT, against Azure DevOps's own default — an unattended " +
    "workflow otherwise notifies reviewers and starts a validation build on every run.",
  idempotent: false,
  params: [
    PROJECT_PARAM,
    { key: "repository", label: "Repository", type: "string", required: true, default: "" },
    {
      key: "sourceBranch",
      label: "Source Branch",
      type: "string",
      required: true,
      default: "",
      hint: "A bare name is expanded to `refs/heads/…`.",
    },
    { key: "targetBranch", label: "Target Branch", type: "string", required: true, default: "" },
    { key: "title", label: "Title", type: "string", required: true, default: "" },
    { key: "description", label: "Description", type: "text", default: "" },
    {
      key: "isDraft",
      label: "Draft",
      type: "boolean",
      default: true,
      hint: "On by default here. A published pull request notifies reviewers and can start a " +
        "validation build the moment it is created.",
    },
    {
      key: "reviewers",
      label: "Reviewer IDs",
      type: "string",
      default: "",
      hint: "Comma-separated identity ids — not email addresses, which are rejected.",
    },
    {
      key: "workItemIds",
      label: "Work Item IDs",
      type: "string",
      default: "",
      hint: "Comma-separated. Linking here is what makes the work item show the pull request.",
    },
  ],
  output: [
    { key: "pullRequestId", type: "number", label: "Pull Request ID" },
    { key: "url", type: "string", label: "API URL" },
    { key: "isDraft", type: "boolean", label: "Whether it was created as a draft" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    const repository = String(p.repository ?? "").trim();
    const title = String(p.title ?? "").trim();
    if (!project) throw new Error("`project` is required");
    if (!repository) throw new Error("`repository` is required");
    if (!title) throw new Error("`title` is required");

    const ref = (name: unknown, field: string) => {
      const text = String(name ?? "").trim();
      if (!text) throw new Error(`\`${field}\` is required`);
      return text.startsWith("refs/") ? text : `refs/heads/${text}`;
    };
    const sourceRefName = ref(p.sourceBranch, "sourceBranch");
    const targetRefName = ref(p.targetBranch, "targetBranch");
    if (sourceRefName === targetRefName) {
      throw new Error("the source and target branches are the same");
    }

    const isDraft = p.isDraft === undefined ? true : p.isDraft === true;
    const client = new AzureDevOpsClient(ctx);
    const pr = await client.request<{ pullRequestId?: number }>(
      client.path(project, "_apis/git/repositories", repository, "pullrequests"),
      {
        method: "POST",
        body: compact({
          sourceRefName,
          targetRefName,
          title,
          description: p.description,
          isDraft,
          reviewers: csv(p.reviewers)?.map((id) => ({ id })),
          workItemRefs: csv(p.workItemIds)?.map((id) => ({ id })),
        }),
      },
    );

    ctx.log("info", "opened an Azure DevOps pull request", {
      pullRequestId: pr?.pullRequestId,
      isDraft,
    });
    return { ...pr, isDraft };
  },
};

export default action;
