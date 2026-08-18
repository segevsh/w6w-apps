import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact } from "../lib/client.ts";

/**
 * `POST /jobPosting.list` — what the careers page shows.
 *
 * The public half of `job-list`. This is what a workflow syncing to a company
 * website, a job aggregator or a Slack "we're hiring" digest actually wants:
 * the postings, with their public titles, locations and descriptions.
 *
 * ## Three filters that quietly change what "all postings" means
 *
 *   - **`listedOnly`** removes unlisted postings — real, published pages that
 *     are deliberately kept off the board index, usually for a confidential or
 *     internal-only search. A careers-page sync should keep them out.
 *   - **`includeUnpublishedJobPostings`** adds drafts, which must never reach a
 *     public page and are exactly what a "what's coming" internal digest wants.
 *   - **`jobBoardId`** picks a board. An organisation with an external and an
 *     internal board has different postings on each, and omitting this gives
 *     you the external one.
 *
 * `location` and `department` filter by **name, case-sensitively** — "Berlin"
 * matches and "berlin" does not, which looks like an empty result rather than a
 * typo.
 *
 * This endpoint is **not paginated**.
 */
const action: ActionDefinition = {
  key: "job-posting-list",
  type: "read",
  resource: "job-posting",
  title: "List job postings",
  description:
    "The public advertisements, as a careers page or aggregator would see them. Location and " +
    "department filters are case-SENSITIVE, so a typo looks like an empty result.",
  params: [
    {
      key: "listedOnly",
      label: "Listed Only",
      type: "boolean",
      default: true,
      hint: "Excludes unlisted postings — published pages deliberately kept off the board index, " +
        "usually confidential searches. Keep this on for anything public-facing.",
    },
    {
      key: "includeUnpublishedJobPostings",
      label: "Include Drafts",
      type: "boolean",
      default: false,
      hint: "Adds unpublished postings. Never for a public page; right for an internal digest.",
    },
    {
      key: "location",
      label: "Location",
      type: "string",
      default: "",
      hint: "Exact name, case-sensitive.",
    },
    {
      key: "department",
      label: "Department",
      type: "string",
      default: "",
      hint: "Exact name, case-sensitive.",
    },
    {
      key: "jobBoardId",
      label: "Job Board ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Omitted, Ashby returns the external board. `job-board-list` is not implemented here " +
        "— the id comes from Ashby's settings.",
    },
  ],
  output: [
    { key: "postings", type: "array", label: "Job postings" },
    { key: "count", type: "number", label: "Postings returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const results = await new AshbyClient(ctx).request<unknown[]>("jobPosting.list", {
      body: compact({
        listedOnly: p.listedOnly === undefined ? true : p.listedOnly === true,
        includeUnpublishedJobPostings: p.includeUnpublishedJobPostings === true ? true : undefined,
        location: p.location,
        department: p.department,
        jobBoardId: p.jobBoardId,
      }),
    });
    const postings = Array.isArray(results) ? results : [];
    return { postings, count: postings.length };
  },
};

export default action;
