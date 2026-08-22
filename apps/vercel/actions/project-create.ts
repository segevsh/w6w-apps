import type { ActionDefinition } from "@w6w/types";
import { compact, json, VercelClient } from "../lib/client.ts";
import { TEAM_PARAM } from "../lib/params.ts";

/**
 * `POST /v11/projects` — verified against Vercel's OpenAPI document
 * (`createProject`; body requires `name`).
 *
 * `gitRepository` is passed as JSON: its shape is `{type, repo}` where `type`
 * is the provider (`github` / `gitlab` / `bitbucket`) and `repo` is the
 * `owner/name` slug, and modelling it as two fields would hide that the pair
 * is optional as a whole.
 */
const action: ActionDefinition = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create a project",
  description: "Create a new Vercel project, optionally linked to a Git repository.",
  // A second call with the same name is rejected, not deduped.
  idempotent: false,
  params: [
    TEAM_PARAM,
    { key: "name", label: "Name", type: "string", required: true, default: "" },
    {
      key: "framework",
      label: "Framework",
      type: "string",
      default: "",
      placeholder: "nextjs",
      hint: "Vercel's framework slug. Leave blank to let Vercel detect it.",
    },
    {
      key: "gitRepository",
      label: "Git Repository",
      type: "json",
      default: "",
      placeholder: '{"type": "github", "repo": "acme/web"}',
    },
    { key: "buildCommand", label: "Build Command", type: "string", default: "" },
    { key: "installCommand", label: "Install Command", type: "string", default: "" },
    { key: "devCommand", label: "Dev Command", type: "string", default: "" },
    { key: "outputDirectory", label: "Output Directory", type: "string", default: "" },
    { key: "rootDirectory", label: "Root Directory", type: "string", default: "" },
    {
      key: "environmentVariables",
      label: "Environment Variables",
      type: "json",
      default: "",
      placeholder: '[{"key": "API_URL", "value": "…", "target": "production"}]',
      hint: "JSON array of env vars to seed the project with.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "accountId", type: "string", label: "Account ID" },
    { key: "framework", type: "string", label: "Framework" },
    { key: "createdAt", type: "number", label: "Created at (ms)" },
    { key: "link", type: "object", label: "Git repository link" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const body = compact({
      name,
      framework: p.framework,
      gitRepository: json(p.gitRepository, "gitRepository"),
      buildCommand: p.buildCommand,
      installCommand: p.installCommand,
      devCommand: p.devCommand,
      outputDirectory: p.outputDirectory,
      rootDirectory: p.rootDirectory,
      environmentVariables: json(p.environmentVariables, "environmentVariables"),
    });

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "creating Vercel project", { name });

    return await client.request("/v11/projects", { method: "POST", body });
  },
};

export default action;
