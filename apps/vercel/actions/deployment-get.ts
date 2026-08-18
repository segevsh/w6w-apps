import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { TEAM_PARAM } from "../lib/params.ts";

/**
 * `GET /v13/deployments/{idOrUrl}` — verified against Vercel's OpenAPI
 * document (`getDeployment`). The path accepts either the deployment ID or its
 * hostname, which is what a webhook or a CI log usually hands you.
 */
const action: ActionDefinition = {
  key: "deployment-get",
  type: "read",
  resource: "deployment",
  title: "Get a deployment",
  description: "Retrieve one deployment by ID or by its deployment URL.",
  params: [
    TEAM_PARAM,
    {
      key: "idOrUrl",
      label: "Deployment ID or URL",
      type: "string",
      required: true,
      default: "",
      placeholder: "dpl_… or my-app-abc123.vercel.app",
    },
    {
      key: "withGitRepoInfo",
      label: "Include Git Repo Info",
      type: "boolean",
      default: false,
      hint: "Adds the `gitSource` object with the repository details.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Deployment ID" },
    { key: "url", type: "string", label: "Deployment URL" },
    { key: "name", type: "string", label: "Project name" },
    { key: "readyState", type: "string", label: "State" },
    { key: "target", type: "string", label: "Target" },
    { key: "createdAt", type: "number", label: "Created at (ms)" },
    { key: "ready", type: "number", label: "Ready at (ms)" },
    { key: "inspectorUrl", type: "string", label: "Inspector URL" },
    { key: "creator", type: "object", label: "Creator" },
    { key: "meta", type: "object", label: "Metadata" },
    { key: "aliasAssigned", type: "boolean", label: "Alias assigned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const idOrUrl = String(p.idOrUrl ?? "").trim();
    if (!idOrUrl) throw new Error("`idOrUrl` is required");

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "getting Vercel deployment", { idOrUrl });

    return await client.request(`/v13/deployments/${encodeURIComponent(idOrUrl)}`, {
      query: { withGitRepoInfo: p.withGitRepoInfo === true ? "true" : undefined },
    });
  },
};

export default action;
