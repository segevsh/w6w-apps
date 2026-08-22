import type { ActionDefinition } from "@w6w/types";
import { compact, GiteaClient } from "../lib/client.ts";

/**
 * `POST /user/repos` and `POST /orgs/{org}/repos` — verified against Gitea's
 * Swagger document (`createCurrentUserRepo`, `createOrgRepo`; both require
 * `name`).
 *
 * **Two endpoints, one question: whose repository is this?** Posting to
 * `/user/repos` creates it under the token's own account whatever `owner` says,
 * so an org repository needs the other path — and getting it wrong produces a
 * real repository in the wrong place rather than an error.
 *
 * `auto_init` matters more than it looks: without it the repository has **no
 * commits and no default branch**, so a `file-write` straight afterwards fails
 * with nothing to branch from. It is on by default here for that reason.
 */
const action: ActionDefinition = {
  key: "repo-create",
  type: "perform",
  resource: "repository",
  title: "Create a repository",
  description: "Create a repository under the token's account or an organization.",
  // Gitea rejects a duplicate name rather than reusing it.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, default: "" },
    {
      key: "org",
      label: "Organization",
      type: "string",
      default: "",
      hint: "Blank creates it under the token's own account. This chooses the endpoint, so it " +
        "cannot be got wrong by accident.",
    },
    { key: "description", label: "Description", type: "text", default: "" },
    { key: "private", label: "Private", type: "boolean", default: true },
    {
      key: "autoInit",
      label: "Initialise With A Commit",
      type: "boolean",
      default: true,
      hint: "Off, the repository has no commits and no default branch — a file write straight " +
        "afterwards has nothing to branch from.",
    },
    {
      key: "defaultBranch",
      label: "Default Branch",
      type: "string",
      default: "",
      hint: "Only meaningful with an initial commit.",
    },
    { key: "gitignores", label: "Gitignore Template", type: "string", default: "" },
    { key: "license", label: "Licence", type: "string", default: "" },
  ],
  output: [
    { key: "id", type: "number", label: "Repository id" },
    { key: "full_name", type: "string", label: "owner/name" },
    { key: "default_branch", type: "string", label: "Default branch" },
    { key: "private", type: "boolean", label: "Private" },
    { key: "html_url", type: "string", label: "Web URL" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    const org = String(p.org ?? "").trim();

    const body = compact({
      name,
      description: p.description,
      default_branch: p.defaultBranch,
      gitignores: p.gitignores,
      license: p.license,
    });
    // Both flags are meaningful when false, so neither goes through `compact`.
    body.private = p.private !== false;
    body.auto_init = p.autoInit !== false;

    ctx.log("info", "creating a Gitea repository", { name, org: org || "(the token's account)" });

    return await new GiteaClient(ctx).request(
      org ? `/orgs/${encodeURIComponent(org)}/repos` : "/user/repos",
      { method: "POST", body },
    );
  },
};

export default action;
