import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Paperform actions.
 *
 * Every field name is transcribed from Paperform's own OpenAPI document (embedded JSON on
 * `paperform.readme.io/reference/*`, fetched 2026-09-29), not inferred.
 */

export const slugOrIdParam: Param = {
  key: "slugOrId",
  label: "Form slug or ID",
  type: "string",
  required: true,
  placeholder: "my-form-slug",
  hint: "The form's default slug, custom slug, or ID — from the `slug`/`custom_slug`/`id` field " +
    "of a List Forms / Get Form response.",
};

export const submissionIdParam: Param = {
  key: "id",
  label: "Submission ID",
  type: "string",
  required: true,
  placeholder: "5d40fdaf174b4c0007043072",
  hint: "Take it from the `id` field of a submission.",
};

export const partialSubmissionIdParam: Param = {
  key: "id",
  label: "Partial submission ID",
  type: "string",
  required: true,
  placeholder: "5d40fdaf174b4c0007043072",
  hint: "Take it from the `id` field of a partial submission.",
};

export const fieldKeyParam: Param = {
  key: "fieldKey",
  label: "Field key",
  type: "string",
  required: true,
  placeholder: "3jbh8",
  hint: "The field's `key`, from List Form Fields.",
};

export const webhookIdParam: Param = {
  key: "id",
  label: "Webhook ID",
  type: "string",
  required: true,
  hint: "Take it from the `id` field of a Create Webhook / List Webhooks response.",
};

export const spaceIdParam: Param = {
  key: "id",
  label: "Space ID",
  type: "string",
  required: true,
  hint: "Take it from the `id` field of a List Spaces response.",
};

/**
 * The `after_id`/`before_id`/`after_date`/`before_date`/`skip`/`limit`/`sort` set every list
 * endpoint (forms, submissions, partial submissions, webhooks, spaces) shares verbatim.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1, max: 100 },
      hint: "The number of results to return. Defaults to 20, maximum 100.",
    },
    {
      key: "skip",
      label: "Skip",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Number of results to skip in the result set. Defaults to 0.",
    },
    {
      key: "afterId",
      label: "After ID",
      type: "string",
      advanced: true,
      hint: "Return results after the provided ID.",
    },
    {
      key: "beforeId",
      label: "Before ID",
      type: "string",
      advanced: true,
      hint: "Return results before the provided ID.",
    },
    {
      key: "afterDate",
      label: "After date",
      type: "datetime",
      advanced: true,
      hint: "Return results created before this date (UTC). Overwritten by After ID.",
    },
    {
      key: "beforeDate",
      label: "Before date",
      type: "datetime",
      advanced: true,
      hint: "Return results created on or after this date-time (UTC). Overwritten by Before ID.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      advanced: true,
      options: [{ value: "ASC", label: "Ascending" }, { value: "DESC", label: "Descending" }],
      hint: "The direction to sort in, by created_at. Defaults to Descending.",
    },
  ];
}

/** Build the query fragment for {@link paginationParams}. */
export interface PaginationInput {
  limit?: number;
  skip?: number;
  afterId?: string;
  beforeId?: string;
  afterDate?: string;
  beforeDate?: string;
  sort?: string;
}

export function paginationQuery(
  input: PaginationInput,
): Record<string, string | number | undefined> {
  return {
    limit: input.limit,
    skip: input.skip,
    after_id: input.afterId,
    before_id: input.beforeId,
    after_date: input.afterDate,
    before_date: input.beforeDate,
    sort: input.sort,
  };
}

/**
 * Attach the pagination siblings from a `PaperformEnvelope` to the array they describe, so
 * a list action's output carries both in one object rather than the caller having to
 * reassemble them.
 */
export function withPagination<T>(
  items: T[] | undefined,
  meta: { total?: number; has_more?: boolean; limit?: number; skip?: number },
): { results: T[]; total?: number; hasMore?: boolean; limit?: number; skip?: number } {
  return {
    results: items ?? [],
    total: meta.total,
    hasMore: meta.has_more,
    limit: meta.limit,
    skip: meta.skip,
  };
}

export const paginationOutput = [
  { key: "results", type: "array" as const, label: "Results" },
  { key: "total", type: "number" as const, label: "Total matching results" },
  { key: "hasMore", type: "boolean" as const, label: "Whether there are more results" },
  { key: "limit", type: "number" as const, label: "The limit used" },
  { key: "skip", type: "number" as const, label: "The number of results skipped" },
];
