import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments, input shapes and query builders for the TeamUp
 * actions.
 *
 * Every name here mirrors the parameter list in the operation data published
 * in TeamUp's own API reference (<https://docs.goteamup.com/api-reference>,
 * read 2026-09-22). The three controls below are documented on *nearly every*
 * operation, which is why they live here rather than being repeated in 29
 * files, and why the note is written once:
 *
 *  - **`expand` / `fields`** — comma-separated field-expansion and
 *    field-selection controls, so a caller can ask for a related object
 *    inline or trim a response down to the fields a step uses.
 *  - **`format`** — the operation's response-format selector (a string, not
 *    the file format a caller might assume).
 *  - **`TeamUp-Provider-ID`** — an optional **header**, documented on every
 *    operation for multi-location businesses. It is not a query parameter,
 *    which is why it is declared here as a param named `providerId` and
 *    forwarded by `lib/client.ts` into the header.
 *
 * `TeamUp-Request-Mode` is deliberately absent: an M2M token always operates
 * in Provider mode, so the header is redundant for this app.
 *
 * Pagination is uniform: `page` is 1-based and defaults to 1, `page_size`
 * defaults to 100 and 100 is also the maximum.
 */

/** The three selection controls plus the provider header — on every action. */
export interface CommonInput {
  /** Comma-separated related objects to expand inline. */
  expand?: string;
  /** Comma-separated field selection, to return only those fields. */
  fields?: string;
  /** The operation's response-format selector. */
  format?: string;
  /** Sent as the `TeamUp-Provider-ID` header when supplied. */
  providerId?: number;
}

/** {@link CommonInput} plus the offset pagination pair every list takes. */
export interface ListInput extends CommonInput {
  /** 1-based page number. TeamUp's default is 1. */
  page?: number;
  /** Records per page. TeamUp's default and maximum are both 100. */
  page_size?: number;
}

/** `TeamUp-Provider-ID` — the one control that travels as a header. */
export const providerIdParam: Param = {
  key: "providerId",
  label: "Provider ID",
  type: "number",
  advanced: true,
  hint: "Sent as the `TeamUp-Provider-ID` header. Only needed to disambiguate a multi-location " +
    "business — list the ids with List Providers. Left unset, TeamUp uses the token's own " +
    "provider.",
};

/** `expand` — comma-separated related-object expansion. */
export const expandParam: Param = {
  key: "expand",
  label: "Expand",
  type: "string",
  advanced: true,
  hint: "Comma-separated related objects to expand inline in the response.",
};

/** `fields` — comma-separated field selection. */
export const fieldsParam: Param = {
  key: "fields",
  label: "Fields",
  type: "string",
  advanced: true,
  hint: "Comma-separated field selection — return only these fields.",
};

/** `format` — the operation's response-format selector. */
export const formatParam: Param = {
  key: "format",
  label: "Format",
  type: "string",
  advanced: true,
  hint: "TeamUp's response-format selector for this operation.",
};

/** The `page` / `page_size` pair every list operation accepts. */
export function paginationParams(): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
      hint: "1-based page of results. Defaults to 1.",
    },
    {
      key: "page_size",
      label: "Page size",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Records per page. TeamUp's default and maximum are both 100.",
    },
  ];
}

/** The controls every action carries, in form order. */
export function commonParams(): Param[] {
  return [expandParam, fieldsParam, formatParam, providerIdParam];
}

/** Pagination plus the common controls, for list actions. */
export function listParams(): Param[] {
  return [...paginationParams(), ...commonParams()];
}

/** The query half of {@link paginationParams}. */
export function paginationQuery(input: ListInput): Record<string, number | undefined> {
  return { page: input.page, page_size: input.page_size };
}

/** The query half of {@link commonParams} — `providerId` is a header, not a query. */
export function commonQuery(input: CommonInput): Record<string, string | undefined> {
  return { expand: input.expand, fields: input.fields, format: input.format };
}

/** The `id` path parameter shared by every get-by-id action. */
export function idParam(hint: string): Param {
  return {
    key: "id",
    label: "ID",
    type: "number",
    required: true,
    validation: { integer: true },
    hint,
  };
}
