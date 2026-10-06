import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient, nextCursor } from "../lib/client.ts";

interface Input {
  schoolUrl: string;
  country?: string;
  enrichProfiles?: string;
  booleanSearchKeyword?: string;
  pageSize?: number;
  studentStatus?: string;
  sortBy?: string;
  resolveNumericId?: string;
  after?: string;
}

/** `GET /school/students/` */
const schoolStudentsList: ActionDefinition<Input> = {
  key: "school-students-list",
  type: "search",
  resource: "school",
  title: "List School Students",
  description:
    "List the students of a school (3 credits per student returned). Filters, sorting and enrichment add credits; see each field.",
  params: [
    { key: "schoolUrl", label: "School profile URL", type: "string", required: true },
    {
      key: "country",
      label: "Country",
      type: "string",
      hint: "Comma-separated alpha-2 codes. Costs 3 extra credits per result.",
    },
    {
      key: "enrichProfiles",
      label: "Enrich profiles",
      type: "select",
      hint:
        "enrich returns full profiles instead of profile URLs, 1 extra credit per result, and caps the page size at 10.",
      options: [{ value: "skip", label: "skip" }, { value: "enrich", label: "enrich" }],
    },
    {
      key: "booleanSearchKeyword",
      label: "Major (boolean search)",
      type: "string",
      hint: "Max 255 characters. Base cost becomes 10 credits plus 6 per student.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "1 to 200000 (default 10); 1 to 10 when enriching.",
    },
    {
      key: "studentStatus",
      label: "Student status",
      type: "select",
      hint: "Vendor default is current.",
      options: [{ value: "current", label: "current" }, { value: "past", label: "past" }, {
        value: "all",
        label: "all",
      }],
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      hint: "Anything but none adds 50 credits plus 10 per student.",
      options: [{ value: "none", label: "none" }, {
        value: "recently-matriculated",
        label: "recently-matriculated",
      }, { value: "recently-graduated", label: "recently-graduated" }],
    },
    {
      key: "resolveNumericId",
      label: "Resolve numeric school IDs",
      type: "select",
      hint: "true costs 2 extra credits.",
      options: [{ value: "false", label: "false" }, { value: "true", label: "true" }],
    },
    {
      key: "after",
      label: "Next-page cursor",
      type: "string",
      hint: "The `nextCursor` from the previous page.",
    },
  ],
  output: [
    { key: "students", type: "array", label: "Students (profile URL, plus profile when enriched)" },
    {
      key: "nextCursor",
      type: "string",
      label: "Cursor for the next page (null on the last page)",
    },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/school/students/", {
      school_url: input.schoolUrl,
      country: input.country,
      enrich_profiles: input.enrichProfiles,
      boolean_search_keyword: input.booleanSearchKeyword,
      page_size: input.pageSize,
      student_status: input.studentStatus,
      sort_by: input.sortBy,
      resolve_numeric_id: input.resolveNumericId,
      after: input.after,
    });
    return {
      students: (res as { students?: unknown[] }).students ?? [],
      nextCursor: nextCursor((res as { next_page?: string | null }).next_page, "after"),
    };
  },
};

export default schoolStudentsList;
