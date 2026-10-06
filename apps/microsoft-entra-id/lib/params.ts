/**
 * Param fragments shared by the actions.
 *
 * Every directory collection speaks the same OData vocabulary (`$filter`, `$search`, `$orderby`,
 * `$select`, `$top`) and the same `@odata.nextLink` paging, so declaring those fields once keeps
 * the list actions honest with each other. Each helper returns a fresh array/object so an action
 * can splice in its own fields without mutating a shared one.
 */
import type { OutputField, Param } from "@w6w/types";

export const userIdParam: Param = {
  key: "userId",
  label: "User",
  type: "string",
  required: true,
  placeholder: "87d349ed-44d7-43e1-9a83-5f2406dee5bd",
  hint: "The user's object id, or their user principal name (`adele@contoso.com`).",
};

export const groupIdParam: Param = {
  key: "groupId",
  label: "Group",
  type: "string",
  required: true,
  placeholder: "02bd9fd6-8f93-4758-87c3-1fb73740a315",
  hint: "The group's object id. Use List Groups.",
};

export const objectIdParam = (key: string, label: string, hint: string): Param => ({
  key,
  label,
  type: "string",
  required: true,
  placeholder: "87d349ed-44d7-43e1-9a83-5f2406dee5bd",
  hint,
});

/** `$select` — directory objects return only a default property set unless asked for more. */
export function selectParam(hint?: string): Param {
  return {
    key: "select",
    label: "Select fields",
    type: "string",
    repeat: true,
    advanced: true,
    hint: hint ??
      "OData `$select`. Graph returns only a default subset of properties; name the ones you need.",
  };
}

/**
 * `$top`, `$filter`, `$search`, `$orderby`, the advanced-query switch and the continuation
 * controls. `$top` caps at 999 for every directory collection in this App.
 *
 * `top` / `orderby` are on by default and switched off for the collections whose reference does
 * not list them (`memberOf` documents neither `$top` nor `$orderby`; members and owners document
 * `$top` but not `$orderby`).
 */
export function listParams(
  opts: { filterHint: string; searchHint?: string; top?: boolean; orderby?: boolean },
): Param[] {
  const params: Param[] = [];
  if (opts.top !== false) {
    params.push({
      key: "top",
      label: "Page size",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 999 },
      hint: "OData `$top` — results per request, 1 to 999 (Graph's default is 100).",
    });
  }
  params.push(
    {
      key: "filter",
      label: "Filter",
      type: "string",
      advanced: true,
      hint: opts.filterHint,
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      advanced: true,
      hint: opts.searchHint ??
        "OData `$search`, e.g. `displayName:Adele`. Quotes are added for you. Works on `displayName` (and `description` for groups); switches Advanced query on by itself.",
    },
  );
  if (opts.orderby !== false) {
    params.push({
      key: "orderby",
      label: "Order by",
      type: "string",
      advanced: true,
      hint:
        "OData `$orderby`, e.g. `displayName`. Ordering together with a filter on another property needs Advanced query.",
    });
  }
  params.push(selectParam(), advancedParam, ...continuationParams());
  return params;
}

/** `ConsistencyLevel: eventual` + `$count=true`. */
export const advancedParam: Param = {
  key: "advancedQuery",
  label: "Advanced query",
  type: "boolean",
  default: false,
  advanced: true,
  hint:
    "Sends `ConsistencyLevel: eventual` and `$count=true`. Required by Graph for `ne`/`not`/`endsWith` filters, `$orderby` combined with `$filter`, and `$count`; `$search` turns it on by itself. Results come from an index that can lag recent writes by a short time.",
};

/** The continuation controls on their own, for collections that document no `$top`. */
export function continuationParams(): Param[] {
  return [
    {
      key: "nextLink",
      label: "Next link",
      type: "string",
      advanced: true,
      hint:
        "The `nextLink` from a previous run. Continues where that run stopped; other query params are ignored because the link already carries them.",
    },
    {
      key: "all",
      label: "Fetch all pages",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Follow `@odata.nextLink` until exhausted or the page cap is reached.",
    },
    {
      key: "maxPages",
      label: "Max pages",
      type: "number",
      default: 10,
      advanced: true,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Upper bound on requests when 'Fetch all pages' is on.",
    },
  ];
}

/** Free-form extra properties, merged over the named fields of a create/update body. */
export const additionalPropertiesParam: Param = {
  key: "additionalProperties",
  label: "Additional properties",
  type: "json",
  advanced: true,
  hint:
    'A JSON object of any other writable property from the Graph resource, merged over the fields above (for example `{"employeeType": "Contractor"}`).',
};

/** The standard `{ value, count, nextLink, pages }` output of every list action. */
export function pagedOutput(label: string): OutputField[] {
  return [
    { key: "value", type: "array", label },
    { key: "count", type: "number", label: "Total count (Advanced query only)" },
    { key: "nextLink", type: "string", label: "Next link" },
    { key: "pages", type: "number", label: "Pages fetched" },
  ];
}
