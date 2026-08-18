import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient, query } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /{org}/{project}/_apis/build/definitions` — the pipelines.
 *
 * The lookup that makes `build-queue` usable: it turns a pipeline's name into
 * the numeric id everything else wants.
 *
 * `includeLatestBuilds` is the parameter worth knowing about. With it, one call
 * answers "which pipelines are currently broken" — the latest run and latest
 * *completed* run come back on each definition, which otherwise needs a
 * `build-list` per pipeline. This action turns it on by default for that
 * reason, and counts the failing ones.
 *
 * The two latest-build fields are not the same: the latest run may still be
 * going, while the latest completed one is the last that finished. Reporting
 * "broken" from the first would call every in-flight pipeline unknown.
 */
const action: ActionDefinition = {
  key: "build-definition-list",
  type: "read",
  resource: "build",
  title: "List pipelines",
  description:
    "Pipelines and, in one call, how each last did. The latest run and the latest COMPLETED run " +
    "are different fields, and only the second says whether it is broken.",
  params: [
    PROJECT_PARAM,
    {
      key: "name",
      label: "Name",
      type: "string",
      default: "",
      hint: "Filters by name; `*` is allowed as a wildcard.",
    },
    {
      key: "includeLatestBuilds",
      label: "Include Latest Runs",
      type: "boolean",
      default: true,
      hint: "Turns this into one call that answers which pipelines are broken.",
    },
    { key: "limit", label: "Limit", type: "number", default: 100 },
  ],
  output: [
    { key: "definitions", type: "array", label: "Pipelines" },
    { key: "count", type: "number", label: "Pipelines returned" },
    { key: "failing", type: "array", label: "Whose last COMPLETED run did not succeed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    if (!project) throw new Error("`project` is required");
    const includeLatest = p.includeLatestBuilds === undefined
      ? true
      : p.includeLatestBuilds === true;

    const client = new AzureDevOpsClient(ctx);
    const definitions = await client.list<{
      id?: number;
      name?: string;
      latestCompletedBuild?: { result?: string };
    }>(client.path(project, "_apis/build/definitions"), {
      query: query({
        name: p.name,
        includeLatestBuilds: includeLatest || undefined,
        $top: Math.max(1, Number(p.limit ?? 100)),
      }),
    });

    // The latest run may still be going; only a completed one has a verdict.
    const failing = definitions
      .filter((d) => {
        const result = d?.latestCompletedBuild?.result;
        return result !== undefined && result !== "succeeded";
      })
      .map((d) => String(d?.name ?? d?.id ?? ""));

    return { definitions, count: definitions.length, failing };
  },
};

export default action;
