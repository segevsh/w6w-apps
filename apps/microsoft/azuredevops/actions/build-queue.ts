import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient, compact, json } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /{org}/{project}/_apis/build/builds` — run a pipeline.
 *
 * ## It returns queued, not finished
 *
 * The response is a build at `status: notStarted` or `inProgress`. Nothing has
 * compiled and no test has run, so a workflow that treats a successful queue as
 * a successful build is asserting something it never checked — `build-get`
 * polling `finished` is the second half.
 *
 * ## The branch decides what actually runs
 *
 * `sourceBranch` selects the code **and the pipeline definition**, because the
 * YAML lives in the repository. Queuing `main` and queuing a feature branch can
 * run entirely different steps, which is the intended behaviour and a surprise
 * the first time a workflow parameterises it.
 *
 * ## Variables are typed as strings, and secrets do not belong here
 *
 * `parameters` is a JSON object of pipeline variables. Azure DevOps records the
 * queue request, so a secret passed this way is written into the run's history
 * where anyone with read access to the pipeline can see it. Pipeline variable
 * groups and secret variables exist for that, and this parameter says so.
 */
const action: ActionDefinition = {
  key: "build-queue",
  type: "perform",
  resource: "build",
  title: "Run a pipeline",
  description:
    "Queue a pipeline run. It returns QUEUED — nothing has compiled — and the branch selects the " +
    "pipeline definition as well as the code, since the YAML lives in the repo.",
  idempotent: false,
  params: [
    PROJECT_PARAM,
    {
      key: "definitionId",
      label: "Pipeline ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `build-definition-list`.",
    },
    {
      key: "sourceBranch",
      label: "Branch",
      type: "string",
      default: "",
      hint: "Selects the code AND the pipeline YAML. Blank uses the definition's default. A bare " +
        "name is expanded to `refs/heads/…`.",
    },
    {
      key: "parameters",
      label: "Variables",
      type: "json",
      default: "",
      hint: 'Pipeline variables as {"name":"value"}. NOT for secrets — the queue request is ' +
        "recorded in the run's history. Use a secret variable or a variable group.",
    },
    {
      key: "reason",
      label: "Reason",
      type: "select",
      default: "manual",
      advanced: true,
      options: [
        { value: "manual", label: "Manual" },
        { value: "individualCI", label: "Continuous integration" },
        { value: "schedule", label: "Schedule" },
      ],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Run ID — poll it with `build-get`" },
    { key: "buildNumber", type: "string", label: "The run's human name" },
    { key: "status", type: "string", label: "notStarted or inProgress — never a result" },
    { key: "queued", type: "boolean", label: "Accepted, not finished" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    const definitionId = String(p.definitionId ?? "").trim();
    if (!project) throw new Error("`project` is required");
    if (!definitionId) throw new Error("`definitionId` is required");

    const branch = String(p.sourceBranch ?? "").trim();
    const parameters = json(p.parameters, "parameters");

    const client = new AzureDevOpsClient(ctx);
    const build = await client.request<{ id?: number; status?: string }>(
      client.path(project, "_apis/build/builds"),
      {
        method: "POST",
        body: compact({
          definition: { id: Number(definitionId) },
          sourceBranch: branch
            ? (branch.startsWith("refs/") ? branch : `refs/heads/${branch}`)
            : undefined,
          // Azure DevOps takes these as a JSON string, not an object.
          parameters: parameters === undefined ? undefined : JSON.stringify(parameters),
          reason: p.reason === undefined ? "manual" : String(p.reason),
        }),
      },
    );

    // The ids and the branch; never the variables, which may carry anything.
    ctx.log("info", "queued an Azure DevOps pipeline run", {
      definitionId,
      buildId: build?.id,
    });
    return { ...build, queued: true };
  },
};

export default action;
