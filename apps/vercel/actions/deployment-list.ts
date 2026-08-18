import type { ActionDefinition } from "@w6w/types";
import { csv, VercelClient } from "../lib/client.ts";
import { LIST_PARAMS, TEAM_PARAM } from "../lib/params.ts";

/**
 * `GET /v7/deployments` — verified against Vercel's OpenAPI document
 * (`getDeployments`). The paged response is
 * `{ deployments: [...], pagination: { count, next, prev } }`.
 */
const action: ActionDefinition = {
  key: "deployment-list",
  type: "read",
  resource: "deployment",
  title: "List deployments",
  description: "List deployments, optionally filtered by project, state, target, branch or SHA.",
  params: [
    TEAM_PARAM,
    ...LIST_PARAMS,
    {
      key: "projectId",
      label: "Project ID or Name",
      type: "string",
      default: "",
      hint: "Filter to one project.",
    },
    {
      key: "state",
      label: "States",
      type: "multiselect",
      default: [],
      options: [
        { value: "BUILDING", label: "Building" },
        { value: "ERROR", label: "Error" },
        { value: "INITIALIZING", label: "Initializing" },
        { value: "QUEUED", label: "Queued" },
        { value: "READY", label: "Ready" },
        { value: "CANCELED", label: "Canceled" },
      ],
      hint: "Vercel takes these as one comma-separated `state` value.",
    },
    {
      key: "target",
      label: "Target",
      type: "select",
      default: "",
      options: [
        { value: "production", label: "Production" },
        { value: "preview", label: "Preview" },
      ],
    },
    { key: "branch", label: "Branch", type: "string", default: "" },
    { key: "sha", label: "Commit SHA", type: "string", default: "" },
    {
      key: "since",
      label: "Since",
      type: "number",
      default: null,
      hint: "JavaScript timestamp (ms). Only deployments created after it.",
    },
    { key: "until", label: "Until", type: "number", default: null, hint: "Timestamp (ms)." },
    {
      key: "rollbackCandidate",
      label: "Rollback Candidates Only",
      type: "boolean",
      default: false,
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = VercelClient.fromConnection(ctx, p.teamId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const states = Array.isArray(p.state) ? p.state : csv(p.state);
    const query = {
      projectId: (p.projectId as string) || undefined,
      // `state` is a single comma-separated value, not a repeated param.
      state: states && states.length ? states.join(",") : undefined,
      target: (p.target as string) || undefined,
      branch: (p.branch as string) || undefined,
      sha: (p.sha as string) || undefined,
      since: typeof p.since === "number" ? p.since : undefined,
      until: typeof p.until === "number" ? p.until : undefined,
      rollbackCandidate: p.rollbackCandidate === true ? "true" : undefined,
    };

    ctx.log("info", "listing Vercel deployments", { returnAll, limit });

    return await client.requestAll(
      "/v7/deployments",
      "deployments",
      { query },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
