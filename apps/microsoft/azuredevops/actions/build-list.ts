import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient, csv, query } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /{org}/{project}/_apis/build/builds` — pipeline runs.
 *
 * ## Status and result are two fields, and only one exists at a time
 *
 * **`status`** is where the run is: `inProgress`, `completed`, `notStarted`,
 * `cancelling`, `postponed`. **`result`** is how it turned out: `succeeded`,
 * `failed`, `canceled`, `partiallySucceeded` — and it is **absent until the run
 * completes**.
 *
 * A workflow checking `result === "failed"` on a running build gets `undefined`
 * and concludes it passed. Checking `status === "completed"` first is the whole
 * of the fix, and this action offers the two as separate filters so the
 * distinction is hard to miss.
 *
 * **`partiallySucceeded`** is the one that gets miscounted: a run with a failing
 * step configured to continue is not `succeeded`, and a dashboard counting only
 * `failed` calls it green.
 *
 * `definitions` narrows to particular pipelines, which is how "did the nightly
 * build pass" gets asked without reading every run in the project.
 */
const action: ActionDefinition = {
  key: "build-list",
  type: "read",
  resource: "build",
  title: "List pipeline runs",
  description:
    "Pipeline runs. `result` does not exist until `status` is completed — so checking for " +
    "failure on a running build reads undefined and concludes it passed.",
  params: [
    PROJECT_PARAM,
    {
      key: "definitionIds",
      label: "Pipeline IDs",
      type: "string",
      default: "",
      hint: "Comma-separated. From `build-definition-list`.",
    },
    {
      key: "statusFilter",
      label: "Status",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any status" },
        { value: "completed", label: "Completed — the only state with a result" },
        { value: "inProgress", label: "Running" },
        { value: "notStarted", label: "Queued" },
        { value: "cancelling", label: "Cancelling" },
      ],
    },
    {
      key: "resultFilter",
      label: "Result",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any result" },
        { value: "succeeded", label: "Succeeded" },
        { value: "failed", label: "Failed" },
        { value: "partiallySucceeded", label: "Partially succeeded — not a pass" },
        { value: "canceled", label: "Canceled" },
      ],
      hint: "Only completed runs have a result at all.",
    },
    {
      key: "branchName",
      label: "Branch",
      type: "string",
      default: "",
      hint: "A full ref — `refs/heads/main`. A bare name is expanded.",
    },
    { key: "minTime", label: "From", type: "datetime", default: "" },
    { key: "maxTime", label: "To", type: "datetime", default: "" },
    { key: "limit", label: "Limit", type: "number", default: 50 },
  ],
  output: [
    { key: "builds", type: "array", label: "Runs, newest first" },
    { key: "count", type: "number", label: "Runs returned" },
    { key: "resultCounts", type: "object", label: "How many of each result" },
    { key: "runningCount", type: "number", label: "Runs with no result yet" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    if (!project) throw new Error("`project` is required");

    const branch = String(p.branchName ?? "").trim();
    const client = new AzureDevOpsClient(ctx);
    const builds = await client.list<{ status?: string; result?: string }>(
      client.path(project, "_apis/build/builds"),
      {
        query: query({
          definitions: csv(p.definitionIds),
          statusFilter: p.statusFilter,
          resultFilter: p.resultFilter,
          branchName: branch
            ? (branch.startsWith("refs/") ? branch : `refs/heads/${branch}`)
            : undefined,
          minTime: p.minTime,
          maxTime: p.maxTime,
          $top: Math.max(1, Number(p.limit ?? 50)),
        }),
      },
    );

    const resultCounts: Record<string, number> = {};
    for (const b of builds) {
      // A run still going has no result at all — counting it as anything is wrong.
      if (!b?.result) continue;
      const key = String(b.result);
      resultCounts[key] = (resultCounts[key] ?? 0) + 1;
    }

    return {
      builds,
      count: builds.length,
      resultCounts,
      runningCount: builds.filter((b) => !b?.result).length,
    };
  },
};

export default action;
