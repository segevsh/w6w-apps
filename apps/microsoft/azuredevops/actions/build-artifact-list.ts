import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /{org}/{project}/_apis/build/builds/{id}/artifacts` — what a run
 * produced.
 *
 * The bridge between a pipeline and whatever happens next: the built package,
 * the test report, the container digest written to a file. Each artifact comes
 * back with a `downloadUrl` a subsequent step can fetch.
 *
 * ## Artifacts outlive their usefulness and then disappear
 *
 * Retention is per pipeline and finite. A workflow that reads an artifact from
 * a build months later gets an empty list rather than an error, which reads as
 * "the build produced nothing" and is really "the build's artifacts were
 * cleaned up". Worth knowing before building a release process that reaches
 * backwards.
 *
 * A run that failed early produces no artifacts either, and the two look
 * identical from here — `build-get` is what distinguishes them.
 */
const action: ActionDefinition = {
  key: "build-artifact-list",
  type: "read",
  resource: "build",
  title: "List a run's artifacts",
  description:
    "What a pipeline run produced, with download URLs. An empty list means either the run failed " +
    "early or its artifacts were cleaned up — `build-get` tells you which.",
  params: [
    PROJECT_PARAM,
    { key: "buildId", label: "Run ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "artifacts", type: "array", label: "Artifacts" },
    { key: "count", type: "number", label: "Artifacts returned" },
    { key: "names", type: "array", label: "Just the names" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    const buildId = String(p.buildId ?? "").trim();
    if (!project) throw new Error("`project` is required");
    if (!buildId) throw new Error("`buildId` is required");

    const client = new AzureDevOpsClient(ctx);
    const artifacts = await client.list<{ name?: string }>(
      client.path(project, "_apis/build/builds", buildId, "artifacts"),
    );

    return {
      artifacts,
      count: artifacts.length,
      names: artifacts.map((a) => String(a?.name ?? "")).filter(Boolean),
    };
  },
};

export default action;
