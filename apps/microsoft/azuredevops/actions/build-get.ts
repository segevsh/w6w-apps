import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /{org}/{project}/_apis/build/builds/{id}` — one pipeline run.
 *
 * What a workflow polls after `build-queue`. The two booleans this returns are
 * the ones worth branching on, and they exist because the underlying fields
 * are easy to misread: **`finished`** is `status === "completed"`, and
 * **`succeeded`** is a result of `succeeded` *only*.
 *
 * `partiallySucceeded` is deliberately not folded into success. A run with a
 * failing step configured to continue produced artifacts and also produced a
 * failure, and a deployment gated on "did the build pass" should stop and ask.
 */
const action: ActionDefinition = {
  key: "build-get",
  type: "read",
  resource: "build",
  title: "Get a pipeline run",
  description:
    "One run, with `finished` and `succeeded` as explicit booleans. `partiallySucceeded` is not " +
    "folded into success — a step failed, and a deployment should stop and ask.",
  params: [
    PROJECT_PARAM,
    { key: "buildId", label: "Run ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "number", label: "Run ID" },
    { key: "buildNumber", type: "string", label: "The run's human name" },
    { key: "status", type: "string", label: "Where it is" },
    { key: "result", type: "string", label: "How it turned out — absent until finished" },
    { key: "finished", type: "boolean", label: "Status is completed" },
    { key: "succeeded", type: "boolean", label: "Result is succeeded, and nothing weaker" },
    { key: "_links", type: "object", label: "Links, including the web UI" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    const buildId = String(p.buildId ?? "").trim();
    if (!project) throw new Error("`project` is required");
    if (!buildId) throw new Error("`buildId` is required");

    const client = new AzureDevOpsClient(ctx);
    const build = await client.request<{ status?: string; result?: string }>(
      client.path(project, "_apis/build/builds", buildId),
    );

    return {
      ...build,
      finished: build?.status === "completed",
      // partiallySucceeded is a failure that produced artifacts.
      succeeded: build?.result === "succeeded",
    };
  },
};

export default action;
