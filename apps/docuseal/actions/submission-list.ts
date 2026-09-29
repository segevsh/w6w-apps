import type { ActionDefinition } from "@w6w/types";
import { DocuSealClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /submissions` — verified against DocuSeal's OpenAPI document
 * (`getSubmissions`).
 */
const submissionList: ActionDefinition = {
  key: "submission-list",
  type: "read",
  resource: "submission",
  title: "List Submissions",
  description: "List submissions, optionally filtered by template, status, or submitter search.",
  params: [
    { key: "templateId", label: "Template ID", type: "number", default: "" },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any" },
        { value: "pending", label: "Pending" },
        { value: "completed", label: "Completed" },
        { value: "declined", label: "Declined" },
        { value: "expired", label: "Expired" },
      ],
    },
    {
      key: "q",
      label: "Search",
      type: "string",
      default: "",
      hint: "Partial match on a submitter's name, email or phone.",
    },
    { key: "slug", label: "Slug", type: "string", default: "" },
    { key: "templateFolder", label: "Template Folder", type: "string", default: "" },
    {
      key: "archived",
      label: "Archived",
      type: "boolean",
      default: "",
      hint: "Only archived when true, only active when false. Leave unset for both.",
    },
    ...LIST_PARAMS,
  ],
  output: [{ key: "[]", type: "array", label: "Submissions" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 10);

    ctx.log("info", "listing DocuSeal submissions", { returnAll, limit });

    return await new DocuSealClient(ctx).requestAll("/submissions", {
      query: {
        template_id: p.templateId ? Number(p.templateId) : undefined,
        status: (p.status as string) || undefined,
        q: (p.q as string) || undefined,
        slug: (p.slug as string) || undefined,
        template_folder: (p.templateFolder as string) || undefined,
        archived: typeof p.archived === "boolean" ? p.archived : undefined,
      },
    }, returnAll ? Infinity : limit);
  },
};

export default submissionList;
