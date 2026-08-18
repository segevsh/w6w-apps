import type { ActionDefinition } from "@w6w/types";
import { compact, csv, GiteaClient, resolveRepo } from "../lib/client.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `PATCH /repos/{owner}/{repo}/issues/{index}` — verified against Gitea's
 * Swagger document (`issueEditIssue`).
 *
 * A `PATCH`, so fields left out are untouched — which is why every field here
 * is optional and unset ones are dropped rather than sent empty. Sending an
 * empty title would not be "leave it"; it would be a validation error.
 *
 * **Closing an issue is a state change here**, not a separate endpoint. That
 * is the common workflow: a deploy succeeds, the issue closes.
 */
const action: ActionDefinition = {
  key: "issue-edit",
  type: "perform",
  resource: "issue",
  title: "Edit an issue",
  description: "Change an issue's title, body, assignees or state — including closing it.",
  idempotent: true,
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    { key: "issueNumber", label: "Issue Number", type: "number", required: true },
    { key: "title", label: "Title", type: "string", default: "" },
    { key: "body", label: "Body", type: "text", default: "" },
    {
      key: "state",
      label: "State",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
      ],
    },
    {
      key: "assignees",
      label: "Assignees",
      type: "string",
      default: "",
      hint: "Comma-separated usernames. Replaces the whole list.",
    },
  ],
  output: [
    { key: "number", type: "number", label: "Issue number" },
    { key: "title", type: "string", label: "Title" },
    { key: "state", type: "string", label: "State" },
    { key: "html_url", type: "string", label: "Web URL" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const number = Number(p.issueNumber);
    if (!Number.isFinite(number)) throw new Error("`issueNumber` is required");

    const body = compact({
      title: p.title,
      body: p.body,
      state: p.state,
      assignees: csv(p.assignees),
    });
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to change — set a title, body, state or assignees");
    }

    ctx.log("info", "editing a Gitea issue", { owner, repo, number, fields: Object.keys(body) });

    return await new GiteaClient(ctx).request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}`,
      { method: "PATCH", body },
    );
  },
};

export default action;
