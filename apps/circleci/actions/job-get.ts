import type { ActionDefinition } from "@w6w/types";
import { circleciFetch, requireProjectSlug } from "../lib/client.ts";

/**
 * Get a single job's details.
 * `GET /project/{project-slug}/job/{job-number}` —
 * https://circleci.com/docs/api/v2/#tag/Job/operation/getJobDetails
 *
 * CircleCI also exposes a global `GET /jobs/{job-id}` keyed by job UUID, but
 * the project-scoped, human-facing job number (the one shown in the
 * CircleCI UI and returned by `job-list` as `job_number`) is the more
 * natural fit alongside this app's other project-scoped actions.
 */
const action: ActionDefinition = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get a job",
  description: "Get details for a single job by its project-relative number",
  params: [
    {
      key: "projectSlug",
      label: "Project Slug",
      type: "string",
      required: true,
      default: "",
      placeholder: "gh/CircleCI-Public/api-preview-docs",
      hint: "vcs-slug/org-name/repo-name. vcs-slug is gh, bb, or circleci.",
    },
    {
      key: "jobNumber",
      label: "Job Number",
      type: "number",
      required: true,
      hint: "The job's project-relative number (the job_number field from job-list)",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectSlug = requireProjectSlug(p.projectSlug);
    const jobNumber = Number(p.jobNumber);
    if (!Number.isFinite(jobNumber)) {
      throw new Error("`jobNumber` is required and must be a number");
    }

    ctx.log("info", "getting CircleCI job", { projectSlug, jobNumber });

    return await circleciFetch(ctx, `/project/${projectSlug}/job/${jobNumber}`);
  },
};

export default action;
