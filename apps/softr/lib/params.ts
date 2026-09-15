import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Softr Database API and Studio Users API
 * actions. Everything here is copied from Softr's own documentation
 * (`docs.softr.io/softr-api/...`, fetched 2026-09-15), not inferred.
 */

export const databaseIdParam: Param = {
  key: "databaseId",
  label: "Database",
  type: "string",
  required: true,
  hint: "The Softr Database's ID. Find it with the List Databases action.",
};

export const tableIdParam: Param = {
  key: "tableId",
  label: "Table",
  type: "string",
  required: true,
  hint: "The table's ID. Find it with the List Tables action.",
};

export const recordIdParam: Param = {
  key: "recordId",
  label: "Record ID",
  type: "string",
  required: true,
};

/**
 * `fieldNames=true` — key the `fields` object by field *name* instead of
 * field *ID*. Off by default, matching the vendor's own default, because a
 * field ID survives a field rename and a field name does not.
 */
export const fieldNamesParam: Param = {
  key: "fieldNames",
  label: "Use field names as keys",
  type: "boolean",
  hint: "If on, the fields object is keyed by field name instead of field ID. Field IDs are " +
    "stable across a field rename; names are not.",
};

/**
 * The offset/limit pair `Get Records` and `Search Records` share.
 *
 * The vendor's own default is `limit=10` — small enough that no override is
 * needed to keep a first call cheap, unlike some vendors whose default is
 * their maximum.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 10,
      validation: { integer: true, min: 1 },
      hint: "Softr's own default.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
    },
  ];
}

export const viewIdParam: Param = {
  key: "viewId",
  label: "View",
  type: "string",
  hint: "Restrict the results to a specific view. Find view IDs with the List Table Views action.",
};

/**
 * The record `fields` payload for Create/Update Record.
 *
 * Softr documents this as a free-form "map of Field IDs to their values" —
 * the shape is defined entirely by the target table's own field schema (List
 * Tables returns each field's `id`, `name` and `type`), not by anything this
 * app can generate a form from.
 */
export const fieldsParam: Param = {
  key: "fields",
  label: "Fields",
  type: "json",
  required: true,
  hint: 'A JSON object mapping field IDs (or, with "Use field names as keys" enabled on read, ' +
    'field names) to their values, e.g. {"fldAbc123": "Acme Inc."}. Get the table\'s field ' +
    "list from the List Tables action.",
};

/**
 * Softr's Search Records filter grammar.
 *
 * Passed straight through as `filter.condition` — see
 * `docs.softr.io/softr-api/softr-database-api/records/search-records` for the
 * full operator vocabulary (binary: IS/CONTAINS/GREATER_THAN/…; unary:
 * IS_EMPTY/IS_NOT_EMPTY; ternary: IS_BETWEEN/IS_WITHIN with lowerBound/
 * upperBound; composite: AND/OR over a nested `conditions` array). Exposing a
 * generated form over four condition shapes and an open operator list would
 * either omit operators or invent structure Softr never documented, so this
 * app takes the vendor's own JSON body verbatim instead.
 */
export const filterParam: Param = {
  key: "filter",
  label: "Filter",
  type: "json",
  hint: 'A Softr filter condition, e.g. {"condition": {"operator": "CONTAINS", ' +
    '"leftSide": "field-id", "rightSide": "acme"}}. Combine with AND/OR via a nested ' +
    '"conditions" array. Leave empty to match every record. Date bounds accept ISO 8601 ' +
    '("2025-05-21") or a relative token: PREDEFINED:TODAY, PREDEFINED:THIS_WEEK, ' +
    "PREDEFINED:THIS_MONTH, … or RELATIVE_DATE:<THIS|PAST|NEXT>:<unit|N> (e.g. " +
    "RELATIVE_DATE:PAST:7 for 7 days ago).",
};

export const sortingParam: Param = {
  key: "sorting",
  label: "Sorting",
  type: "json",
  hint: 'An array of {"sortingField": "field-id", "sortType": "ASC" | "DESC"}.',
};

/** The Studio Users API's per-call app selector — see `lib/client.ts` for why it's not a credential. */
export const domainParam: Param = {
  key: "domain",
  label: "Softr app domain",
  type: "string",
  required: true,
  placeholder: "yourdomain.com",
  hint: "The domain or subdomain of the published Softr app this call targets (e.g. " +
    "yourdomain.softr.app or a connected custom domain). Sent as the Softr-Domain header.",
};

export const userEmailParam: Param = {
  key: "email",
  label: "User email",
  type: "string",
  required: true,
};
