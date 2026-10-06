import type { ActionDefinition } from "@w6w/types";
import { compact, list, SkyvernClient } from "../lib/client.ts";
import { runIdParam } from "../lib/params.ts";

/** `GET /v1/runs/{run_id}/artifacts` — recordings, screenshots, logs and HTML for a run. */
interface Input {
  runId: string;
  artifactTypes?: string[] | string;
}

const runArtifacts: ActionDefinition<Input> = {
  key: "run-artifacts",
  type: "read",
  resource: "run",
  title: "Get Run Artifacts",
  description:
    "List a run's artifacts (recording, screenshots, logs, HTML) with signed download URLs.",
  params: [
    runIdParam,
    {
      key: "artifactTypes",
      label: "Artifact types",
      type: "string",
      hint:
        "Comma-separated artifact types to keep, e.g. `recording,screenshot_final`. Empty returns all.",
    },
  ],
  output: [
    {
      key: "artifacts",
      type: "array",
      label: "Artifacts (artifact_id, artifact_type, uri, signed_url, …)",
    },
    { key: "count", type: "number", label: "Count" },
  ],

  async execute(input, ctx) {
    const artifacts = await new SkyvernClient(ctx).json<unknown[]>(
      `/v1/runs/${encodeURIComponent(input.runId)}/artifacts`,
      { query: compact({ artifact_type: list(input.artifactTypes) }) },
    );
    return { artifacts: artifacts ?? [], count: (artifacts ?? []).length };
  },
};

export default runArtifacts;
