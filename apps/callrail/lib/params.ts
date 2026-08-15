import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the CallRail actions.
 *
 * Every field name, filter and enum here is copied from CallRail's own
 * reference (`apidocs.callrail.com`, fetched and read whole on 2026-08-15),
 * not inferred from a sibling app.
 */

/**
 * Every action in this app is account-scoped, and — unlike vendors that infer
 * the account from the credential — CallRail's API keys can see more than one
 * account, so the account id is always an explicit param. Use `account-list`
 * to discover which ids a given API key can reach.
 */
export const accountIdParam: Param = {
  key: "accountId",
  label: "Account ID",
  type: "string",
  required: true,
  placeholder: "ACC8154748ae6bd4e278a7cddd38a662f4f",
  hint: "The CallRail account this request is scoped to. Use List Accounts to find it, or read " +
    "the nine-digit number following /a/ in the CallRail app's own URL.",
};

/** `company_id` — narrows most list endpoints to one company within the account. */
export const companyIdParam: Param = {
  key: "companyId",
  label: "Company",
  type: "string",
  hint: "Limit to a single company. Leave empty to return results across every company in the " +
    "account.",
};

/**
 * `page`/`per_page` — CallRail's offset pagination, used by every list
 * endpoint in this app. The vendor's own default `per_page` is 100 with a
 * documented maximum of 250 on most endpoints; that default is left as the
 * host's own placeholder (unset) rather than hard-coded here, since unlike
 * Apify's 1,000-record ceiling it is not large enough to be a footgun.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "First page is 1. Defaults to 1.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      validation: { integer: true, min: 1, max: 250 },
      hint: "Defaults to 100. Most endpoints support a maximum of 250.",
    },
  ];
}

/**
 * `sort` / `order` — shared by every endpoint that supports sorting. The
 * sortable field list differs per endpoint, so callers pass their own hint
 * naming the fields that endpoint actually accepts.
 */
export function sortParams(fieldsHint: string): Param[] {
  return [
    {
      key: "sort",
      label: "Sort by",
      type: "string",
      hint: `The field to sort by. ${fieldsHint}`,
    },
    {
      key: "order",
      label: "Sort order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
      hint: "Requires `sort` to be set.",
      showIf: { "!!": { var: "sort" } },
    },
  ];
}

/** `fields` — CallRail's field-selection param, a comma-separated list of extra response fields. */
export const fieldsParam: Param = {
  key: "fields",
  label: "Additional fields",
  type: "string",
  hint: "Comma-separated list of extra response fields to include, beyond this endpoint's " +
    'default set. See the endpoint\'s own "Additional User Requested Response Fields" table ' +
    "in the CallRail API reference.",
};

/**
 * `date_range` / `start_date` / `end_date` (+ `time_zone`), shared by Listing
 * All Calls, Call Summary/Timeseries and Listing All Conversations.
 *
 * `date_range` and `start_date`/`end_date` are alternative ways to express the
 * same filter; the reference does not document what happens when both are
 * sent; `date_range` is left to `recent` (the vendor's own default) unless the
 * caller supplies explicit dates.
 */
export function dateRangeParams(): Param[] {
  return [
    {
      key: "dateRange",
      label: "Date range",
      type: "select",
      options: [
        { value: "recent", label: "Recent — last 30 days including today (default)" },
        { value: "today", label: "Today" },
        { value: "yesterday", label: "Yesterday" },
        { value: "last_7_days", label: "Last 7 days" },
        { value: "last_30_days", label: "Last 30 days" },
        { value: "this_month", label: "This month" },
        { value: "last_month", label: "Last month" },
        { value: "this_year", label: "This year" },
        { value: "last_year", label: "Last year" },
        { value: "all_time", label: "All time" },
      ],
      hint: "Ignored when Start date / End date are set.",
    },
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      placeholder: "2016-10-17 or 2016-10-17T09:00",
      hint: "ISO 8601 date, or date + time. Overrides Date range when set together with End date.",
    },
    {
      key: "endDate",
      label: "End date",
      type: "string",
      placeholder: "2016-10-17",
      hint: "ISO 8601 date, or date + time. Inclusive — matches through 23:59:59 on a date-only " +
        "value.",
    },
    {
      key: "timeZone",
      label: "Time zone",
      type: "string",
      placeholder: "America/New_York",
      hint: "Interprets Date range / Start date / End date in this time zone. Defaults to the " +
        "account's own time zone.",
    },
  ];
}

/** `tags` filter — accepted as a repeated `tags[]=` array by every endpoint that supports it. */
export const tagsFilterParam: Param = {
  key: "tags",
  label: "Filter by tags",
  type: "string",
  hint: "Comma-separated tag names. Matches records tagged with ANY of the listed tags.",
};

/** CallRail's three user roles, shared by the Users endpoints. */
export const userRoleOptions = [
  { value: "admin", label: "Administrator — full access to every company" },
  {
    value: "manager",
    label: "Manager — numbers, forms and integrations within assigned companies",
  },
  { value: "reporting", label: "Reporting — view and tag calls within assigned companies" },
];

/**
 * CallRail's fixed tag-colour vocabulary — each name picks both an ink and a
 * background colour, per the reference's "Available Colors" table.
 */
export const tagColorOptions = [
  { value: "gray1", label: "Gray 1" },
  { value: "gray2", label: "Gray 2" },
  { value: "blue1", label: "Blue 1" },
  { value: "blue2", label: "Blue 2" },
  { value: "cyan1", label: "Cyan 1" },
  { value: "cyan2", label: "Cyan 2" },
  { value: "purple1", label: "Purple 1" },
  { value: "purple2", label: "Purple 2" },
  { value: "pink1", label: "Pink 1" },
  { value: "pink2", label: "Pink 2" },
  { value: "pink3", label: "Pink 3" },
  { value: "pink4", label: "Pink 4" },
  { value: "red1", label: "Red 1" },
  { value: "red2", label: "Red 2" },
  { value: "orange1", label: "Orange 1" },
  { value: "orange2", label: "Orange 2" },
  { value: "orange3", label: "Orange 3" },
  { value: "orange4", label: "Orange 4" },
  { value: "yellow1", label: "Yellow 1" },
  { value: "yellow2", label: "Yellow 2" },
  { value: "green1", label: "Green 1" },
  { value: "green2", label: "Green 2" },
  { value: "green3", label: "Green 3" },
  { value: "green4", label: "Green 4" },
];

/** Lead status, shared by Calls and Form Submissions. */
export const leadStatusOptions = [
  { value: "good_lead", label: "Good lead" },
  { value: "not_a_lead", label: "Not a lead" },
  { value: "not_scored", label: "Not scored" },
];
