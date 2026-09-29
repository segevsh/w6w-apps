import type { Output, Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Sharetribe Integration API actions.
 *
 * Every field name and enum here is copied from Sharetribe's own hand-written API reference
 * (fetched 2026-09-29), not inferred.
 */

/**
 * The JSON:API-flavoured resource shape every `show`/command endpoint answers, unwrapped from
 * its `{data}` envelope by `SharetribeClient.show`/`.command`. Mirrors `apps/kustomer`'s
 * `recordOutput`, the other JSON:API-shaped vendor in this pack.
 */
export const resourceOutput: Output = [
  { key: "id", type: "string", label: "Resource ID" },
  { key: "type", type: "string", label: "Resource type" },
  { key: "attributes", type: "object", label: "Resource attributes" },
  { key: "relationships", type: "object", label: "Related resource references, if included" },
];

/** The full envelope a `query` endpoint answers: `{data: [...], meta: {...}}`. */
export const listOutput: Output = [
  { key: "data", type: "array", label: "Resources" },
  {
    key: "meta",
    type: "object",
    label: "Pagination metadata (totalItems, totalPages, page, perPage)",
  },
  { key: "included", type: "array", label: "Included related resources, when requested" },
];

export const idParam: Param = {
  key: "id",
  label: "ID",
  type: "string",
  required: true,
  hint: "UUID of the resource, e.g. from a previous list/query action's output.",
};

/** The `include` common query parameter — every endpoint accepts it. */
export const includeParam: Param = {
  key: "include",
  label: "Include related resources",
  type: "string",
  hint: 'Comma-separated list of relationships to include, e.g. "author,images". See the ' +
    "resource's own relationships in Sharetribe's API reference.",
};

/**
 * The page/perPage pair every `query` endpoint uses.
 *
 * The vendor's own default page size is 100 — kept as the default here too, unlike some other
 * apps in this pack that deliberately shrink an oversized vendor default; 100 rows of listing/
 * user/transaction summaries is not the multi-megabyte-response problem Apify's 1,000-row
 * dataset default is.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Page number. Not supported by every query — see the action's own description.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 100 },
    },
  ];
}

/** `state` schema on the `user` resource. */
export const userStateOptions = [
  { value: "active", label: "Active" },
  { value: "pendingApproval", label: "Pending operator approval" },
  { value: "banned", label: "Banned" },
];

/** `state` schema on the `listing` resource, valid for `listings/create`'s `state` body param. */
export const listingCreateStateOptions = [
  { value: "published", label: "Published" },
  { value: "pendingApproval", label: "Pending operator approval" },
];

/** The extended-data body params shared by every listing/user/transaction write action. */
export const publicDataParam: Param = {
  key: "publicData",
  label: "Public data",
  type: "json",
  hint: "Object, merged with existing publicData at the top level (non-deep merge). A top-level " +
    "key set to null removes it. Max 50KB as JSON.",
};

export const privateDataParam: Param = {
  key: "privateData",
  label: "Private data",
  type: "json",
  hint: "Object, merged with existing privateData at the top level (non-deep merge). A top-level " +
    "key set to null removes it. Max 50KB as JSON.",
};

export const metadataParam: Param = {
  key: "metadata",
  label: "Metadata (public)",
  type: "json",
  hint: "Object, merged with existing metadata at the top level (non-deep merge). A top-level " +
    "key set to null removes it. Max 50KB as JSON.",
};

export const geolocationParam: Param = {
  key: "geolocation",
  label: "Geolocation",
  type: "json",
  hint: 'Object with "lat" and "lng". Pass null (on update) to remove the location.',
};

export const priceParam: Param = {
  key: "price",
  label: "Price",
  type: "json",
  hint: 'Object with "amount" (integer, minor currency unit — cents for USD) and "currency" ' +
    "(ISO 4217 code). Pass null (on update) to remove the price.",
};

export const listingIdParam: Param = { ...idParam, key: "listingId", label: "Listing ID" };
export const authorIdParam: Param = {
  key: "authorId",
  label: "Author (user) ID",
  type: "string",
  required: true,
  hint: "UUID of the marketplace user the listing belongs to.",
};

/**
 * `createdAtStart`/`createdAtEnd` — the immutable-timestamp filter pair shared by
 * users/query, listings/query and transactions/query, and the recommended way to page past
 * each endpoint's 10,000-result non-default-sort/filter limit.
 */
export function createdAtRangeParams(): Param[] {
  return [
    {
      key: "createdAtStart",
      label: "Created at or after",
      type: "datetime",
      hint: "ISO 8601 timestamp. Only resources created on or after this time are returned.",
    },
    {
      key: "createdAtEnd",
      label: "Created before",
      type: "datetime",
      hint: "ISO 8601 timestamp. Only resources created before this time are returned.",
    },
  ];
}
