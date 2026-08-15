import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Thinkific actions.
 *
 * Every default and ceiling here is copied from Thinkific's own OpenAPI
 * document and the "REST API Response Format" support article (fetched
 * 2026-08-15), not inferred.
 */

/**
 * The `page` / `limit` pair every list endpoint in this app uses.
 *
 * `limit` defaults to 25 and the vendor documents a **maximum of 250**
 * ("REST API Response Format" — Pagination); asking for more is silently
 * capped rather than rejected, so the hint says the real ceiling instead of
 * letting a caller believe a larger number changes anything.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
      hint: "The page within the collection to fetch. Defaults to 1.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1, max: 250 },
      hint: "Items per page. Defaults to 25; the vendor caps this at 250.",
    },
  ];
}

export interface PaginationInput {
  page?: number;
  limit?: number;
}

export function paginationQuery(input: PaginationInput): Record<string, number | undefined> {
  return { page: input.page, limit: input.limit };
}

/** A numeric Thinkific resource id, addressed purely by path. */
export function idParam(label: string, hint?: string): Param {
  return {
    key: "id",
    label,
    type: "string",
    required: true,
    placeholder: "123",
    hint: hint ?? `The numeric ${label} ID.`,
  };
}

/** ISO 8601 date-time hint, shared by every activation/expiry field. */
export const ISO_DATETIME_HINT = "ISO 8601, e.g. 2026-08-15T03:33:33.723Z.";
