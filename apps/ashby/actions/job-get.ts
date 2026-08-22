import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact, csv } from "../lib/client.ts";

/**
 * `POST /job.info` — one role in full.
 *
 * The expansions are where the value is. `openings` turns "we are hiring an
 * engineer" into how many seats, approved by whom, targeted at which start
 * date — the difference between a job and a headcount plan. `compensation` and
 * `location` fill in the rest of what an offer or a posting needs.
 *
 * `includeUnpublishedJobPostingsIds` reveals draft postings attached to the
 * job, which is how a workflow finds a posting that has been written and not
 * yet published.
 */
const action: ActionDefinition = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get a job",
  description:
    "One role, optionally with its openings — how many seats, approved by whom, targeted at " +
    "which start date, which is the difference between a job and a headcount plan.",
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true, default: "" },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      default: "openings",
      hint: "`openings`, `location`, `compensation`.",
    },
    {
      key: "includeUnpublishedJobPostingsIds",
      label: "Include Draft Posting IDs",
      type: "boolean",
      default: false,
      hint: "Reveals postings written but not yet published.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Draft, Open, Closed or Archived" },
    { key: "openings", type: "array", label: "The seats, when expanded" },
    { key: "hiringTeam", type: "array", label: "Who owns it" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.jobId ?? "").trim();
    if (!id) throw new Error("`jobId` is required");

    return await new AshbyClient(ctx).request("job.info", {
      body: compact({
        id,
        // The param's default is applied here too, so a bare call still gets
        // the openings — the half that turns a job into a headcount plan.
        expand: csv(p.expand === undefined ? "openings" : p.expand),
        includeUnpublishedJobPostingsIds: p.includeUnpublishedJobPostingsIds === true
          ? true
          : undefined,
      }),
    });
  },
};

export default action;
