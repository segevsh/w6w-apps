import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { TEAM_PARAM } from "../lib/params.ts";

/**
 * `GET /v4/aliases/{idOrAlias}` — verified against Vercel's OpenAPI document
 * (`getAlias`).
 */
const action: ActionDefinition = {
  key: "alias-get",
  type: "read",
  resource: "alias",
  title: "Get an alias",
  description: "Retrieve one alias by its hostname or alias ID.",
  params: [
    TEAM_PARAM,
    {
      key: "idOrAlias",
      label: "Alias or Alias ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "my-app.com",
    },
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      default: "",
      hint: "Return the alias only if it belongs to this project.",
    },
  ],
  output: [
    { key: "uid", type: "string", label: "Alias ID" },
    { key: "alias", type: "string", label: "Alias" },
    { key: "created", type: "string", label: "Created" },
    { key: "createdAt", type: "number", label: "Created at (ms)" },
    { key: "deploymentId", type: "string", label: "Deployment ID" },
    { key: "projectId", type: "string", label: "Project ID" },
    { key: "deployment", type: "object", label: "Deployment" },
    { key: "redirect", type: "string", label: "Redirect target" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const idOrAlias = String(p.idOrAlias ?? "").trim();
    if (!idOrAlias) throw new Error("`idOrAlias` is required");

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "getting Vercel alias", { idOrAlias });

    return await client.request(`/v4/aliases/${encodeURIComponent(idOrAlias)}`, {
      query: { projectId: (p.projectId as string) || undefined },
    });
  },
};

export default action;
