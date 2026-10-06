import type { OutputField, Param } from "@w6w/types";

/**
 * Shared `Param` fragments. Every name, default and ceiling here comes from Document360's v3
 * OpenAPI document (fetched 2026-10-06): query and body fields are `snake_case`, `page_size`
 * defaults to 25 and caps at 100, ids are UUIDs.
 */

export const projectIdParam: Param = {
  key: "projectId",
  label: "Project ID",
  type: "string",
  hint: "Optional. Defaults to the project on the Connection. List ids with Project: List.",
  advanced: true,
};

export const pageParam: Param = {
  key: "page",
  label: "Page",
  type: "number",
  default: 1,
  validation: { min: 1, integer: true },
  hint: "1-based page number.",
};

export const pageSizeParam: Param = {
  key: "pageSize",
  label: "Page size",
  type: "number",
  default: 25,
  validation: { min: 1, max: 100, integer: true },
  hint: "Results per page. Document360 caps it at 100.",
};

export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  advanced: true,
  hint: "A previous response's pagination.next_cursor. When set, page is ignored.",
};

export const includeTotalCountParam: Param = {
  key: "includeTotalCount",
  label: "Include total count",
  type: "boolean",
  default: false,
  advanced: true,
  hint: "Adds pagination.total_count to the response.",
};

/** page, pageSize, cursor and includeTotalCount — the paging block of the cursor-capable lists. */
export const pagingParams: Param[] = [
  pageParam,
  pageSizeParam,
  cursorParam,
  includeTotalCountParam,
];

export const langCodeParam: Param = {
  key: "langCode",
  label: "Language code",
  type: "string",
  placeholder: "en",
  hint: "ISO 639-1 code. Defaults to the project's default language.",
};

export const workspaceIdParam: Param = {
  key: "workspaceId",
  label: "Workspace ID",
  type: "string",
  required: true,
  hint: "A workspace (project version) id. List them with Workspace: List.",
};

export const articleIdParam: Param = {
  key: "articleId",
  label: "Article ID",
  type: "string",
  required: true,
};

export const categoryIdParam: Param = {
  key: "categoryId",
  label: "Category ID",
  type: "string",
  required: true,
};

export const folderIdParam: Param = {
  key: "folderId",
  label: "Folder ID",
  type: "string",
  required: true,
};

export const contentTypeOptions = [
  { value: "markdown", label: "Markdown" },
  { value: "wysiwyg", label: "WYSIWYG (HTML)" },
  { value: "block", label: "Block editor" },
];

export const categoryTypeOptions = [
  { value: "folder", label: "Folder" },
  { value: "page", label: "Page" },
  { value: "index", label: "Index" },
];

export const translationOptionOptions = [
  { value: "none", label: "None" },
  { value: "needTranslation", label: "Needs translation" },
  { value: "translated", label: "Translated" },
  { value: "inProgress", label: "In progress" },
];

/** Query object for the shared paging block. */
export function pagingQuery(
  input: { page?: number; pageSize?: number; cursor?: string; includeTotalCount?: boolean },
): Record<string, unknown> {
  return {
    page: input.page,
    page_size: input.pageSize,
    cursor: input.cursor,
    include_total_count: input.includeTotalCount ? true : undefined,
  };
}

/** Output declaration shared by every list action. */
export const listOutput: OutputField[] = [
  { key: "items", type: "array", label: "Items on this page" },
  { key: "pagination", type: "object", label: "Pagination block (has_more, next_cursor)" },
];
