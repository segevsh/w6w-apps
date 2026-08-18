import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { LIST_PARAMS, TEAM_PARAM } from "../lib/params.ts";

/**
 * `GET /v10/projects` — verified against Vercel's OpenAPI document
 * (`getProjects`). Paged response: `{ projects: [...], pagination: {...} }`.
 */
const action: ActionDefinition = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List projects",
  description: "List the projects in the connection's team or personal account.",
  params: [
    TEAM_PARAM,
    ...LIST_PARAMS,
    { key: "search", label: "Search", type: "string", default: "", hint: "Match on project name." },
    {
      key: "repo",
      label: "Repository",
      type: "string",
      default: "",
      hint: "Filter to projects connected to this repo.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = VercelClient.fromConnection(ctx, p.teamId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Vercel projects", { returnAll, limit });

    return await client.requestAll(
      "/v10/projects",
      "projects",
      {
        query: {
          search: (p.search as string) || undefined,
          repo: (p.repo as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
