import type { ActionDefinition } from "@w6w/types";
import { compact, VercelClient } from "../lib/client.ts";
import { PROJECT_PARAM, TEAM_PARAM } from "../lib/params.ts";

/**
 * `PATCH /v9/projects/{idOrName}` — verified against Vercel's OpenAPI document
 * (`updateProject`). Every body property is optional; only what the caller set
 * is sent.
 */
const action: ActionDefinition = {
  key: "project-update",
  type: "perform",
  resource: "project",
  title: "Update a project",
  description: "Change a project's name, framework, or build settings.",
  idempotent: true,
  params: [
    TEAM_PARAM,
    PROJECT_PARAM,
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "framework", label: "Framework", type: "string", default: "" },
    { key: "buildCommand", label: "Build Command", type: "string", default: "" },
    { key: "installCommand", label: "Install Command", type: "string", default: "" },
    { key: "devCommand", label: "Dev Command", type: "string", default: "" },
    { key: "outputDirectory", label: "Output Directory", type: "string", default: "" },
    { key: "rootDirectory", label: "Root Directory", type: "string", default: "" },
    { key: "nodeVersion", label: "Node Version", type: "string", default: "", placeholder: "22.x" },
    {
      key: "publicSource",
      label: "Public Source",
      type: "boolean",
      default: null,
      hint: "Expose the source and logs at `/_logs` and `/_src`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "framework", type: "string", label: "Framework" },
    { key: "buildCommand", type: "string", label: "Build command" },
    { key: "nodeVersion", type: "string", label: "Node version" },
    { key: "updatedAt", type: "number", label: "Updated at (ms)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");

    const body = compact({
      name: p.name,
      framework: p.framework,
      buildCommand: p.buildCommand,
      installCommand: p.installCommand,
      devCommand: p.devCommand,
      outputDirectory: p.outputDirectory,
      rootDirectory: p.rootDirectory,
      nodeVersion: p.nodeVersion,
      publicSource: typeof p.publicSource === "boolean" ? p.publicSource : undefined,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update — set at least one field");
    }

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "updating Vercel project", { projectId, fields: Object.keys(body) });

    return await client.request(`/v9/projects/${encodeURIComponent(projectId)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default action;
