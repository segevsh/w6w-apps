import type { ActionDefinition } from "@w6w/types";
import { compact, csv, VercelClient } from "../lib/client.ts";
import { PROJECT_PARAM, TEAM_PARAM } from "../lib/params.ts";

/**
 * `POST /v10/projects/{idOrName}/env` — verified against Vercel's OpenAPI
 * document (`createProjectEnv`). The body is a `oneOf`: a single variable
 * object or an array of them. This action sends the single form, whose schema
 * requires `key`, `value` and `type`, plus one of `target` or
 * `customEnvironmentIds`.
 *
 * `type` matters and is not cosmetic: `plain` is readable back,
 * `encrypted` is not, and `sensitive` cannot be read back even by the
 * dashboard. Defaulting to `encrypted` matches what the dashboard does for a
 * value you type into it.
 */
const action: ActionDefinition = {
  key: "env-create",
  type: "perform",
  resource: "env",
  title: "Create an environment variable",
  description: "Add an environment variable to a project.",
  // Not idempotent by default: a second create of the same key is rejected
  // unless Upsert is on.
  idempotent: false,
  params: [
    TEAM_PARAM,
    PROJECT_PARAM,
    {
      key: "key",
      label: "Key",
      type: "string",
      required: true,
      default: "",
      placeholder: "API_URL",
    },
    { key: "value", label: "Value", type: "secret", required: true },
    {
      key: "target",
      label: "Targets",
      type: "multiselect",
      default: ["production"],
      options: [
        { value: "production", label: "Production" },
        { value: "preview", label: "Preview" },
        { value: "development", label: "Development" },
      ],
      hint: "Vercel requires at least one target (or a custom environment).",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "encrypted",
      options: [
        { value: "encrypted", label: "Encrypted" },
        { value: "plain", label: "Plain" },
        { value: "sensitive", label: "Sensitive (never readable back)" },
      ],
    },
    {
      key: "gitBranch",
      label: "Git Branch",
      type: "string",
      default: "",
      hint: "Scopes the variable to one branch. Requires the `preview` target.",
    },
    { key: "comment", label: "Comment", type: "string", default: "" },
    {
      key: "upsert",
      label: "Upsert",
      type: "boolean",
      default: false,
      hint: "Overwrite the variable if it already exists instead of failing.",
    },
  ],
  output: [
    { key: "created", type: "object", label: "Created variable" },
    { key: "failed", type: "array", label: "Failures" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    const key = String(p.key ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");
    if (!key) throw new Error("`key` is required");
    const value = p.value;
    if (typeof value !== "string" || value === "") throw new Error("`value` is required");

    const target = Array.isArray(p.target) ? p.target : csv(p.target);
    const gitBranch = (p.gitBranch as string) || undefined;
    if (gitBranch && !(target ?? []).includes("preview")) {
      // Vercel rejects this combination; saying so here beats a 400 with a
      // field name the form does not show.
      throw new Error("`gitBranch` requires the `preview` target");
    }

    const body = compact({
      key,
      value,
      type: p.type || "encrypted",
      target,
      gitBranch,
      comment: p.comment,
    });

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "creating Vercel env var", { projectId, key, target });

    return await client.request(`/v10/projects/${encodeURIComponent(projectId)}/env`, {
      method: "POST",
      body,
      // Vercel reads this as the string "true", not a boolean.
      query: { upsert: p.upsert === true ? "true" : undefined },
    });
  },
};

export default action;
