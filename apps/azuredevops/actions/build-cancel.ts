import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `PATCH /{org}/{project}/_apis/build/builds/{id}` with
 * `status: "cancelling"` — stop a run.
 *
 * ## Cancelling is a request, and the state says so
 *
 * The status becomes **`cancelling`**, not `cancelled`. The agent has to notice
 * and stop, which takes as long as the current step does — a run inside a
 * twenty-minute test suite stays `cancelling` for up to twenty minutes, and any
 * `always()` steps in the pipeline still execute.
 *
 * So a workflow that cancels and immediately assumes the agent is free is
 * wrong. This returns `cancelling` as a state rather than claiming the run is
 * over.
 *
 * Worth automating for the case that justifies it: superseded runs on a branch
 * that has had three pushes while the first build was still queued.
 */
const action: ActionDefinition = {
  key: "build-cancel",
  type: "perform",
  resource: "build",
  title: "Cancel a pipeline run",
  description:
    "Ask a run to stop. The status becomes `cancelling`, not cancelled — the agent stops when " +
    "the current step ends, and `always()` steps still run.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    { key: "buildId", label: "Run ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "number", label: "Run ID" },
    { key: "status", type: "string", label: "cancelling — the agent has been asked" },
    { key: "stopped", type: "boolean", label: "True only once it has actually stopped" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    const buildId = String(p.buildId ?? "").trim();
    if (!project) throw new Error("`project` is required");
    if (!buildId) throw new Error("`buildId` is required");

    const client = new AzureDevOpsClient(ctx);
    const build = await client.request<{ status?: string }>(
      client.path(project, "_apis/build/builds", buildId),
      { method: "PATCH", body: { status: "cancelling" } },
    );

    ctx.log("info", "asked an Azure DevOps run to cancel", { buildId, status: build?.status });
    return { ...build, stopped: build?.status === "completed" };
  },
};

export default action;
