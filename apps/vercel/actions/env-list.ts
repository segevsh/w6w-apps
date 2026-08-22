import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { PROJECT_PARAM, TEAM_PARAM } from "../lib/params.ts";

/**
 * `GET /v10/projects/{idOrName}/env` — verified against Vercel's OpenAPI
 * document (`filterProjectEnvs`).
 *
 * `decrypt` is exposed but defaults off: an encrypted variable's value comes
 * back redacted unless you ask for it, and pulling secrets into a workflow's
 * step output should be a deliberate act rather than the default.
 */
const action: ActionDefinition = {
  key: "env-list",
  type: "read",
  resource: "env",
  title: "List environment variables",
  description: "List a project's environment variables.",
  params: [
    TEAM_PARAM,
    PROJECT_PARAM,
    {
      key: "gitBranch",
      label: "Git Branch",
      type: "string",
      default: "",
      hint: "Only variables scoped to this branch.",
    },
    {
      key: "decrypt",
      label: "Decrypt Values",
      type: "boolean",
      default: false,
      hint: "Return encrypted values in plaintext. Off by default — this puts secrets in the " +
        "step output.",
    },
  ],
  output: [
    { key: "envs", type: "array", label: "Environment variables" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "listing Vercel env vars", { projectId, decrypt: p.decrypt === true });

    return await client.request(`/v10/projects/${encodeURIComponent(projectId)}/env`, {
      query: {
        gitBranch: (p.gitBranch as string) || undefined,
        // Vercel reads this as the string "true", not a boolean.
        decrypt: p.decrypt === true ? "true" : undefined,
      },
    });
  },
};

export default action;
