import type { Param } from "@w6w/types";

export const projectIdParam: Param = {
  key: "projectId",
  label: "Project ID",
  type: "string",
  required: true,
  hint: "Phrase Strings project id (from Project List, or the project's URL).",
};

export const branchParam: Param = {
  key: "branch",
  label: "Branch",
  type: "string",
  hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
};

export const queryParam = (hint: string): Param => ({
  key: "q",
  label: "Search query",
  type: "string",
  hint,
});

/** `page` and `per_page`; Phrase's own default is 25, its maximum 100. */
export function paginationParams(perPage = 25): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
      hint: "1-based. The output's `nextPage` is absent on the last page.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: perPage,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Phrase's default is 25 and its maximum is 100.",
    },
  ];
}

export const pageOutput = [
  { key: "items", type: "array", label: "Results on this page" },
  { key: "page", type: "number", label: "Current page" },
  { key: "perPage", type: "number", label: "Page size" },
  { key: "totalCount", type: "number", label: "Total items (when Phrase reports it)" },
  { key: "totalPages", type: "number", label: "Total pages (when Phrase reports it)" },
  { key: "nextPage", type: "number", label: "Next page number; absent on the last page" },
] as const;
