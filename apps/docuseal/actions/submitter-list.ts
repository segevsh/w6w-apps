import type { ActionDefinition } from "@w6w/types";
import { DocuSealClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /submitters` — verified against DocuSeal's OpenAPI document
 * (`getSubmitters`).
 */
const submitterList: ActionDefinition = {
  key: "submitter-list",
  type: "read",
  resource: "submitter",
  title: "List Submitters",
  description:
    "List submitters, optionally filtered by submission, name/email/phone search, or completion date.",
  params: [
    { key: "submissionId", label: "Submission ID", type: "number", default: "" },
    {
      key: "q",
      label: "Search",
      type: "string",
      default: "",
      hint: "Partial match on name, email or phone.",
    },
    { key: "slug", label: "Slug", type: "string", default: "" },
    {
      key: "completedAfter",
      label: "Completed After",
      type: "string",
      default: "",
      hint: "e.g. 2024-03-05 9:32:20.",
    },
    { key: "completedBefore", label: "Completed Before", type: "string", default: "" },
    { key: "externalId", label: "External ID", type: "string", default: "" },
    ...LIST_PARAMS,
  ],
  output: [{ key: "[]", type: "array", label: "Submitters" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 10);

    ctx.log("info", "listing DocuSeal submitters", { returnAll, limit });

    return await new DocuSealClient(ctx).requestAll("/submitters", {
      query: {
        submission_id: p.submissionId ? Number(p.submissionId) : undefined,
        q: (p.q as string) || undefined,
        slug: (p.slug as string) || undefined,
        completed_after: (p.completedAfter as string) || undefined,
        completed_before: (p.completedBefore as string) || undefined,
        external_id: (p.externalId as string) || undefined,
      },
    }, returnAll ? Infinity : limit);
  },
};

export default submitterList;
