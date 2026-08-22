import type { ActionDefinition } from "@w6w/types";
import { compact, csv, GiteaClient, resolveRepo } from "../lib/client.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `POST /repos/{owner}/{repo}/issues` — verified against Gitea's Swagger
 * document (`issueCreateIssue`; required `title`).
 *
 * **Labels and milestones are numeric ids, not names.** Gitea takes
 * `labels: [3, 7]` and `milestone: 2`; passing `["bug"]` is a validation error
 * rather than a lookup. `label-list` is where the ids come from — which is why
 * that read exists in an app that otherwise does not manage labels.
 */
const action: ActionDefinition = {
  key: "issue-create",
  type: "perform",
  resource: "issue",
  title: "Create an issue",
  description: "Open an issue on a repository.",
  // Two calls create two issues; Gitea does not dedupe by title.
  idempotent: false,
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    { key: "title", label: "Title", type: "string", required: true, default: "" },
    { key: "body", label: "Body", type: "text", default: "" },
    {
      key: "assignees",
      label: "Assignees",
      type: "string",
      default: "",
      hint: "Comma-separated usernames.",
    },
    {
      key: "labels",
      label: "Label IDs",
      type: "string",
      default: "",
      hint: "Comma-separated NUMERIC ids, not names — see List Labels.",
    },
    {
      key: "milestone",
      label: "Milestone ID",
      type: "number",
      default: 0,
      hint: "Numeric id. 0 means none.",
    },
    {
      key: "dueDate",
      label: "Due Date",
      type: "string",
      default: "",
      hint: "ISO 8601 timestamp.",
    },
  ],
  output: [
    { key: "number", type: "number", label: "Issue number — what every other action takes" },
    { key: "id", type: "number", label: "Internal id" },
    { key: "title", type: "string", label: "Title" },
    { key: "state", type: "string", label: "open or closed" },
    { key: "html_url", type: "string", label: "Web URL" },
    { key: "user", type: "object", label: "Author" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const title = String(p.title ?? "").trim();
    if (!title) throw new Error("`title` is required");

    const labels = csv(p.labels)?.map((id) => {
      const n = Number(id);
      if (!Number.isFinite(n)) {
        throw new Error(`label "${id}" is not a numeric id — Gitea takes label ids, not names`);
      }
      return n;
    });
    const milestone = Number(p.milestone ?? 0);

    const body = compact({
      title,
      body: p.body,
      assignees: csv(p.assignees),
      labels,
      milestone: milestone > 0 ? milestone : undefined,
      due_date: p.dueDate,
    });

    ctx.log("info", "creating a Gitea issue", { owner, repo });

    return await new GiteaClient(ctx).request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
      { method: "POST", body },
    );
  },
};

export default action;
