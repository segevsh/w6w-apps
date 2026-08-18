import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact, csv } from "../lib/client.ts";

/**
 * `POST /jobPosting.info` — one posting, with the description that goes on a
 * page.
 *
 * The reason to fetch a posting individually rather than from the list is the
 * content: the full job description, the application form's questions, and the
 * compensation Ashby is configured to show publicly. That last one matters —
 * what a posting displays is not necessarily the job's internal compensation
 * band, and publishing the wrong one is a mistake with consequences.
 *
 * `includeUnpublishedJobPostings` is **required** to fetch a draft; without it
 * a draft's id returns nothing, which reads as a deleted posting.
 */
const action: ActionDefinition = {
  key: "job-posting-get",
  type: "read",
  resource: "job-posting",
  title: "Get a job posting",
  description:
    "One posting with its description, application questions and publicly-shown compensation — " +
    "which is not necessarily the job's internal band.",
  params: [
    { key: "jobPostingId", label: "Job Posting ID", type: "string", required: true, default: "" },
    {
      key: "includeUnpublishedJobPostings",
      label: "Allow Drafts",
      type: "boolean",
      default: false,
      hint: "REQUIRED to fetch a draft. Without it a draft's id returns nothing, which reads as " +
        "a deleted posting.",
    },
    {
      key: "jobBoardId",
      label: "Job Board ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Returns the posting as it appears on that board.",
    },
    { key: "expand", label: "Expand", type: "string", default: "", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Job Posting ID" },
    { key: "title", type: "string", label: "Public title" },
    { key: "descriptionHtml", type: "string", label: "The description as published" },
    { key: "isListed", type: "boolean", label: "Whether it appears on the board index" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const jobPostingId = String(p.jobPostingId ?? "").trim();
    if (!jobPostingId) throw new Error("`jobPostingId` is required");

    return await new AshbyClient(ctx).request("jobPosting.info", {
      body: compact({
        jobPostingId,
        includeUnpublishedJobPostings: p.includeUnpublishedJobPostings === true ? true : undefined,
        jobBoardId: p.jobBoardId,
        expand: csv(p.expand),
      }),
    });
  },
};

export default action;
