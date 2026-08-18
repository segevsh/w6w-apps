import type { ActionDefinition } from "@w6w/types";
import { compact, csv, VercelClient } from "../lib/client.ts";
import { PROJECT_PARAM, TEAM_PARAM } from "../lib/params.ts";

/**
 * `PATCH /v9/projects/{idOrName}/env/{id}` — verified against Vercel's OpenAPI
 * document (`editProjectEnv`). Every body property is optional.
 */
const action: ActionDefinition = {
  key: "env-update",
  type: "perform",
  resource: "env",
  title: "Update an environment variable",
  description: "Change an existing environment variable's value, targets, or type.",
  idempotent: true,
  params: [
    TEAM_PARAM,
    PROJECT_PARAM,
    {
      key: "envId",
      label: "Variable ID",
      type: "string",
      required: true,
      default: "",
      hint: "The `id` from List environment variables.",
    },
    { key: "key", label: "Key", type: "string", default: "" },
    { key: "value", label: "Value", type: "secret" },
    {
      key: "target",
      label: "Targets",
      type: "multiselect",
      default: [],
      options: [
        { value: "production", label: "Production" },
        { value: "preview", label: "Preview" },
        { value: "development", label: "Development" },
      ],
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "",
      options: [
        { value: "encrypted", label: "Encrypted" },
        { value: "plain", label: "Plain" },
        { value: "sensitive", label: "Sensitive (never readable back)" },
      ],
    },
    { key: "gitBranch", label: "Git Branch", type: "string", default: "" },
    { key: "comment", label: "Comment", type: "string", default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Variable ID" },
    { key: "key", type: "string", label: "Key" },
    { key: "value", type: "string", label: "Value" },
    { key: "type", type: "string", label: "Type" },
    { key: "target", type: "array", label: "Targets" },
    { key: "gitBranch", type: "string", label: "Git branch" },
    { key: "updatedAt", type: "number", label: "Updated at (ms)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    const envId = String(p.envId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");
    if (!envId) throw new Error("`envId` is required");

    const target = Array.isArray(p.target) && p.target.length ? p.target : csv(p.target);
    const body = compact({
      key: p.key,
      value: p.value,
      type: p.type,
      target,
      gitBranch: p.gitBranch,
      comment: p.comment,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update — set at least one field");
    }

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "updating Vercel env var", { projectId, envId, fields: Object.keys(body) });

    return await client.request(
      `/v9/projects/${encodeURIComponent(projectId)}/env/${encodeURIComponent(envId)}`,
      { method: "PATCH", body },
    );
  },
};

export default action;
