import type { ActionDefinition } from "@w6w/types";
import {
  AirbyteClient,
  assertUuid,
  csv,
  isJobHealthy,
  jobDurationSeconds,
  query,
} from "../lib/client.ts";

/**
 * `GET /v1/jobs` — sync history.
 *
 * ## `incomplete` is the status that gets missed
 *
 * Airbyte's job statuses are `pending`, `running`, `incomplete`, `failed`,
 * `succeeded` and `cancelled`. A workflow that branches on `failed` treats
 * **`incomplete`** as a success — and an incomplete sync is one where some
 * streams moved and others did not, which is a table that is silently missing
 * a day of rows.
 *
 * This action counts it separately from both, and never folds it into either.
 *
 * ## Filtering by two things silently uses one
 *
 * Airbyte documents it plainly: "If you try to filter by both `connectionId`
 * and `workspaceIds`, the only thing filtered-by will be `connectionId`." Not
 * an error — a precedence, so a report scoped to a workspace *and* a
 * connection is scoped to the connection alone. This action refuses both
 * rather than quietly discarding one.
 *
 * ## The duration is the thing that trends
 *
 * A sync that took four minutes last week and forty today is the early warning
 * for a source that is about to start timing out. Airbyte reports start and
 * update timestamps rather than a duration, so this computes it.
 */
const action: ActionDefinition = {
  key: "job-list",
  type: "search",
  resource: "job",
  title: "List jobs",
  description:
    "Sync history, with INCOMPLETE counted separately from succeeded and failed — a workflow " +
    "branching on `failed` treats an incomplete sync as a success, and an incomplete sync is a " +
    "table missing rows. Computes each job's duration, which is what trends.",
  params: [
    {
      key: "connectionId",
      label: "Connection ID",
      type: "string",
      default: "",
      hint: "One pipeline's history. Cannot be combined with workspace ids — Airbyte would " +
        "silently ignore those.",
    },
    {
      key: "workspaceIds",
      label: "Workspace IDs",
      type: "string",
      default: "",
      hint: "Comma-separated. Cannot be combined with a connection id.",
    },
    {
      key: "jobType",
      label: "Job type",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Syncs and resets" },
        { value: "sync", label: "Syncs" },
        { value: "reset", label: "Resets" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any status" },
        { value: "running", label: "Running" },
        { value: "succeeded", label: "Succeeded" },
        { value: "failed", label: "Failed" },
        { value: "incomplete", label: "Incomplete — partly moved" },
        { value: "cancelled", label: "Cancelled" },
        { value: "pending", label: "Pending" },
      ],
    },
    { key: "limit", label: "Limit", type: "number", default: 20 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "jobs", type: "array", label: "The jobs, newest first" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "succeeded", type: "number", label: "Moved everything" },
    { key: "failed", type: "number", label: "Moved nothing" },
    { key: "incomplete", type: "number", label: "Moved some streams and not others" },
    { key: "running", type: "array", label: "Still going" },
    { key: "latest", type: "object", label: "The most recent job" },
    { key: "lastSuccessAt", type: "string", label: "When data last fully arrived" },
    { key: "averageDurationSeconds", type: "number", label: "Across the finished jobs" },
    { key: "totalRowsSynced", type: "number", label: "Across the jobs returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const connectionId = String(p.connectionId ?? "").trim();
    const workspaceIds = csv(p.workspaceIds);

    // Airbyte would keep the connection id and drop the workspaces silently.
    if (connectionId && workspaceIds?.length) {
      throw new Error(
        "give a `connectionId` or `workspaceIds`, not both — Airbyte documents that it keeps " +
          "the connection id and silently ignores the workspaces, so the result would be " +
          "narrower than it looks",
      );
    }
    if (connectionId) assertUuid(connectionId, "connectionId");

    const body = await new AirbyteClient(ctx).request<{
      data?: Array<{
        jobId?: number;
        status?: string;
        jobType?: string;
        connectionId?: string;
        startTime?: string;
        lastUpdatedAt?: string;
        duration?: string;
        rowsSynced?: number;
      }>;
    }>("/jobs", {
      query: query({
        connectionId,
        workspaceIds: workspaceIds?.join(","),
        jobType: String(p.jobType ?? ""),
        status: String(p.status ?? ""),
        limit: Math.max(1, Math.min(100, Number(p.limit ?? 20))),
        offset: Math.max(0, Number(p.offset ?? 0)),
      }),
    });

    const jobs = (body?.data ?? []).map((job) => ({
      ...job,
      durationSeconds: jobDurationSeconds(job),
    }));

    const withStatus = (status: string) => jobs.filter((job) => job?.status === status);
    const incomplete = withStatus("incomplete");
    if (incomplete.length) {
      ctx.log(
        "warn",
        "some jobs finished INCOMPLETE — some streams moved and others did not, which is " +
          "neither a success nor a failure and is missing data either way",
        { count: incomplete.length },
      );
    }

    const finished = jobs.filter((job) => typeof job.durationSeconds === "number");
    const averageDurationSeconds = finished.length
      ? Math.round(
        finished.reduce((sum, job) => sum + Number(job.durationSeconds), 0) / finished.length,
      )
      : undefined;

    return {
      jobs,
      count: jobs.length,
      succeeded: jobs.filter((job) => isJobHealthy(job?.status)).length,
      failed: withStatus("failed").length,
      incomplete: incomplete.length,
      running: withStatus("running").map((job) => job?.jobId),
      latest: jobs[0],
      // When data last fully arrived, which is the number people mean by "is
      // the pipeline healthy".
      lastSuccessAt: jobs.find((job) => isJobHealthy(job?.status))?.lastUpdatedAt,
      averageDurationSeconds,
      totalRowsSynced: jobs.reduce((sum, job) => sum + Number(job?.rowsSynced ?? 0), 0),
    };
  },
};

export default action;
