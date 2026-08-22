import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";

/**
 * `GET /v1/check-statuses/{checkId}` — verified against Checkly's OpenAPI
 * document (`getV1CheckstatusesCheckid`).
 *
 * One check's current state. See `check-status-list` for why `hasFailures` and
 * `hasErrors` are not the same question.
 */
const action: ActionDefinition = {
  key: "check-status-get",
  type: "read",
  resource: "check-status",
  title: "Get a check's current status",
  description: "The current pass/fail state of one monitor.",
  params: [
    { key: "checkId", label: "Check ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "checkId", type: "string", label: "Check ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "hasFailures", type: "boolean", label: "The monitored thing is wrong" },
    { key: "hasErrors", type: "boolean", label: "The check itself did not complete" },
    { key: "isDegraded", type: "boolean", label: "Degraded" },
    { key: "longestRun", type: "number", label: "Longest run (ms)" },
    { key: "shortestRun", type: "number", label: "Shortest run (ms)" },
    { key: "lastRunLocation", type: "string", label: "Where it last ran" },
    { key: "lastCheckRunId", type: "string", label: "Last run id" },
    { key: "updated_at", type: "string", label: "Last updated" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.checkId ?? "").trim();
    if (!id) throw new Error("`checkId` is required");

    ctx.log("info", "getting a Checkly check status", { id });

    return await new ChecklyClient(ctx).request(
      `/v1/check-statuses/${encodeURIComponent(id)}`,
    );
  },
};

export default action;
