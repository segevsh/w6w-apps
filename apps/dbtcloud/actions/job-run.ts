import type { ActionDefinition } from "@w6w/types";
import { compact, csv, DbtCloudClient, runStatusName } from "../lib/client.ts";

/**
 * `POST /api/v2/accounts/{account}/jobs/{job}/run/` — kick off a job.
 *
 * This is the action most dbt Cloud workflows exist for: something upstream
 * landed — an ingestion finished, a file arrived, a deploy completed — and the
 * models need rebuilding against it.
 *
 * ## It returns immediately, and the run has not started
 *
 * The response is a Run at status **1 (Queued)**. Nothing has been built, no
 * model has compiled, and no test has passed. A workflow that treats a
 * successful trigger as a successful build is asserting something it has not
 * checked; `run-get` polling `is_complete` is the second half.
 *
 * ## `cause` is required, by dbt and by this action
 *
 * dbt's API makes it mandatory, and it is right to: the cause is what appears
 * beside the run in the dbt Cloud UI, and an analytics engineer looking at an
 * unexpected 3am rebuild wants to read "triggered by the Fivetran sync
 * workflow", not "API". It is the cheapest observability in the whole
 * integration.
 *
 * ## The overrides are a sharp instrument
 *
 * `steps_override` replaces the job's dbt commands entirely, and
 * `schema_override` sends the build somewhere other than its configured target.
 * Together they are how a workflow builds a subset into a scratch schema; used
 * carelessly they are how a workflow writes test data into production, since
 * dbt will not stop you. Both are marked advanced and documented as such.
 */
const action: ActionDefinition = {
  key: "job-run",
  type: "perform",
  resource: "job",
  title: "Trigger a job run",
  description:
    "Kick off a dbt Cloud job. It returns a QUEUED run immediately — nothing is built yet, so " +
    "poll `run-get` before treating it as a successful build.",
  idempotent: false,
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true, default: "" },
    {
      key: "cause",
      label: "Cause",
      type: "string",
      required: true,
      default: "Triggered by w6w",
      hint: "Required by dbt, and shown beside the run in the UI. Say what triggered it — the " +
        "person reading an unexpected 3am rebuild is the audience.",
    },
    {
      key: "gitBranch",
      label: "Git Branch",
      type: "string",
      default: "",
      hint: "Check out this branch instead of the job's own.",
    },
    {
      key: "gitSha",
      label: "Git SHA",
      type: "string",
      default: "",
      advanced: true,
      hint: "Build an exact commit. Wins over the branch.",
    },
    {
      key: "stepsOverride",
      label: "Steps Override",
      type: "string",
      default: "",
      advanced: true,
      placeholder: "dbt seed, dbt run --select tag:hourly",
      hint: "REPLACES the job's dbt commands entirely — the job's own steps do not run.",
    },
    {
      key: "schemaOverride",
      label: "Schema Override",
      type: "string",
      default: "",
      advanced: true,
      hint: "Builds into this schema instead of the job's configured target. dbt will not warn " +
        "you if that is production.",
    },
    {
      key: "targetNameOverride",
      label: "Target Name Override",
      type: "string",
      default: "",
      advanced: true,
      hint: "Overrides the `target.name` context variable, which project code often branches on.",
    },
    {
      key: "threadsOverride",
      label: "Threads Override",
      type: "number",
      default: 0,
      advanced: true,
    },
    {
      key: "timeoutSecondsOverride",
      label: "Timeout Override (seconds)",
      type: "number",
      default: 0,
      advanced: true,
    },
    {
      key: "generateDocsOverride",
      label: "Generate Docs",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "Use the job's setting" },
        { value: "true", label: "Generate docs" },
        { value: "false", label: "Skip docs" },
      ],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Run ID — poll this with `run-get`" },
    { key: "status", type: "number", label: "Status number (1 = Queued)" },
    { key: "statusName", type: "string", label: "Status, named" },
    { key: "href", type: "string", label: "Link to the run in dbt Cloud" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const jobId = String(p.jobId ?? "").trim();
    if (!jobId) throw new Error("`jobId` is required");
    const cause = String(p.cause ?? "").trim();
    if (!cause) {
      throw new Error(
        "`cause` is required — dbt makes it mandatory, and it is what appears beside the run in " +
          "the UI",
      );
    }

    const client = new DbtCloudClient(ctx);
    const steps = csv(p.stepsOverride);
    const docs = String(p.generateDocsOverride ?? "");

    if (p.schemaOverride) {
      ctx.log("warn", "triggering a dbt run against an overridden schema", {
        jobId,
        schema: String(p.schemaOverride),
      });
    }

    const run = await client.request<{ id?: number; status?: number }>(
      `/api/v2/accounts/${client.accountId}/jobs/${encodeURIComponent(jobId)}/run/`,
      {
        method: "POST",
        body: compact({
          cause,
          git_branch: p.gitBranch,
          git_sha: p.gitSha,
          steps_override: steps,
          schema_override: p.schemaOverride,
          target_name_override: p.targetNameOverride,
          threads_override: Number(p.threadsOverride ?? 0) || undefined,
          timeout_seconds_override: Number(p.timeoutSecondsOverride ?? 0) || undefined,
          generate_docs_override: docs === "" ? undefined : docs === "true",
        }),
      },
    );

    ctx.log("info", "queued a dbt Cloud run", { jobId, runId: run?.id });
    return { ...run, statusName: runStatusName(run?.status) };
  },
};

export default action;
