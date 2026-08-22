import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient, query } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /{org}/{project}/_apis/git/repositories/{id}/refs` — branches and tags.
 *
 * Azure DevOps has no "branches" endpoint. It has **refs**, and branches and
 * tags come back from the same call distinguished only by their prefix:
 * `refs/heads/…` and `refs/tags/…`. Asking for branches means filtering by
 * that prefix, which this action does — and it returns the bare names alongside
 * the full refs, because the API wants refs and a person wants names.
 *
 * `filterContains` is a substring match, which is how a workflow finds the
 * branch for a ticket without knowing whether somebody wrote `feature/AB-123`
 * or `AB-123-fix-login`.
 */
const action: ActionDefinition = {
  key: "branch-list",
  type: "read",
  resource: "repository",
  title: "List branches",
  description:
    "Azure DevOps has no branches endpoint — only refs, where branches and tags differ by prefix " +
    "alone. This filters to one and returns both the full refs and the bare names.",
  params: [
    PROJECT_PARAM,
    { key: "repository", label: "Repository", type: "string", required: true, default: "" },
    {
      key: "kind",
      label: "Kind",
      type: "select",
      default: "heads",
      options: [
        { value: "heads", label: "Branches" },
        { value: "tags", label: "Tags" },
        { value: "", label: "Every ref" },
      ],
    },
    {
      key: "contains",
      label: "Name Contains",
      type: "string",
      default: "",
      hint: "Substring match — finds a ticket's branch whether it is `feature/AB-123` or " +
        "`AB-123-fix-login`.",
    },
  ],
  output: [
    { key: "refs", type: "array", label: "Refs, with their object ids" },
    { key: "names", type: "array", label: "Bare names, with the prefix stripped" },
    { key: "count", type: "number", label: "Refs returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    const repository = String(p.repository ?? "").trim();
    if (!project) throw new Error("`project` is required");
    if (!repository) throw new Error("`repository` is required");

    const kind = p.kind === undefined ? "heads" : String(p.kind);
    const client = new AzureDevOpsClient(ctx);
    const refs = await client.list<{ name?: string }>(
      client.path(project, "_apis/git/repositories", repository, "refs"),
      {
        query: query({
          filter: kind || undefined,
          filterContains: p.contains,
        }),
      },
    );

    // The API wants refs; a person wants names.
    const names = refs
      .map((r) => String(r?.name ?? "").replace(/^refs\/(heads|tags)\//, ""))
      .filter(Boolean);

    return { refs, names, count: refs.length };
  },
};

export default action;
