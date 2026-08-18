import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { PROJECT_PARAM, TEAM_PARAM } from "../lib/params.ts";

/**
 * `GET /v1/projects/{projectId}/deployments/{deploymentId}/runtime-logs` —
 * verified against Vercel's OpenAPI document (`getRuntimeLogs`).
 *
 * Runtime logs are a different thing from build logs: these are what the
 * deployed functions emitted while serving traffic, which is what you read
 * when production is misbehaving. `deployment-event-list` covers the build.
 */
const action: ActionDefinition = {
  key: "runtime-log-list",
  type: "read",
  resource: "log",
  title: "List a deployment's runtime logs",
  description: "Read the runtime (function) logs for one deployment of a project.",
  params: [
    TEAM_PARAM,
    PROJECT_PARAM,
    { key: "deploymentId", label: "Deployment ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "level", type: "string", label: "Level" },
    { key: "message", type: "string", label: "Message" },
    { key: "source", type: "string", label: "Source" },
    { key: "timestampInMs", type: "number", label: "Timestamp (ms)" },
    { key: "domain", type: "string", label: "Domain" },
    { key: "requestMethod", type: "string", label: "Request method" },
    { key: "requestPath", type: "string", label: "Request path" },
    { key: "responseStatusCode", type: "number", label: "Response status" },
    { key: "rowId", type: "string", label: "Row ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    const deploymentId = String(p.deploymentId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");
    if (!deploymentId) throw new Error("`deploymentId` is required");

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "reading Vercel runtime logs", { projectId, deploymentId });

    return await client.request(
      `/v1/projects/${encodeURIComponent(projectId)}/deployments/${
        encodeURIComponent(deploymentId)
      }/runtime-logs`,
    );
  },
};

export default action;
