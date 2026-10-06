import type { OutputField, Param } from "@w6w/types";

/** `id` for records Pylon also lets you address by an external ID. */
export const idParam = (label: string, hint?: string): Param => ({
  key: "id",
  label,
  type: "string",
  required: true,
  ...(hint ? { hint } : {}),
});

export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint: "The `nextCursor` from the previous page.",
};

/** Page size; Pylon documents "greater than 0 and less than 1000" for the 100-default lists. */
export const limitParam = (label = "Limit"): Param => ({
  key: "limit",
  label,
  type: "number",
  hint: "Defaults to 100. Must be greater than 0 and less than 1000.",
  validation: { min: 1, max: 999, integer: true },
});

export const searchTextParam: Param = {
  key: "searchText",
  label: "Search text",
  type: "string",
  hint: "Fuzzy text search, intersected with any filter.",
};

export const filterParam = (fields: string): Param => ({
  key: "filter",
  label: "Filter",
  type: "json",
  hint:
    'A Pylon filter, e.g. {"field":"email","operator":"equals","value":"a@b.com"}. Combine with ' +
    '"and"/"or" and `subfilters` (max depth 3); multi-valued operators ("in", "not_in") take ' +
    `\`values\`. Filterable fields: ${fields}.`,
});

export const customFieldsParam = (what: string): Param => ({
  key: "customFields",
  label: "Custom fields",
  type: "json",
  hint: `Custom field values on this ${what}: an object {"slug": "value"} (an array value sets ` +
    'multi-select `values`) or Pylon\'s array [{"slug":"…","value":"…"}].',
});

export const tagsParam = (what: string, replace = true): Param => ({
  key: "tags",
  label: "Tags",
  type: "array",
  item: { type: "string" },
  hint: `Tag names. ${
    replace ? `Replaces the ${what}'s tags with exactly this list.` : `Tags to apply.`
  }`,
});

export const REQUEST_ID: OutputField = { key: "request_id", type: "string", label: "Request ID" };

export const PAGE_OUTPUT: OutputField[] = [
  { key: "hasNextPage", type: "boolean", label: "Whether more results remain" },
  { key: "nextCursor", type: "string", label: "Cursor for the next page; absent on the last" },
];

export const ISSUE_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Issue ID" },
  { key: "number", type: "number", label: "Issue number" },
  { key: "title", type: "string", label: "Title" },
  { key: "state", type: "string", label: "State" },
  { key: "type", type: "string", label: "conversation or ticket" },
  { key: "link", type: "string", label: "Link to the issue in Pylon" },
  { key: "body_html", type: "string", label: "Body (HTML)" },
  { key: "account", type: "object", label: "Account (id)" },
  { key: "assignee", type: "object", label: "Assignee (id, email)" },
  { key: "requester", type: "object", label: "Requester (id, email)" },
  { key: "tags", type: "array", label: "Tags" },
  { key: "custom_fields", type: "object", label: "Custom fields by slug" },
  { key: "created_at", type: "string", label: "Created at" },
];

export const ACCOUNT_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Account ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "type", type: "string", label: "Account type" },
  { key: "primary_domain", type: "string", label: "Primary domain" },
  { key: "domains", type: "array", label: "Domains" },
  { key: "external_ids", type: "array", label: "External IDs" },
  { key: "owner", type: "object", label: "Owner (id, email)" },
  { key: "tags", type: "array", label: "Tags" },
  { key: "custom_fields", type: "object", label: "Custom fields by slug" },
  { key: "is_disabled", type: "boolean", label: "Disabled" },
  { key: "created_at", type: "string", label: "Created at" },
];

export const CONTACT_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Contact ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "email", type: "string", label: "Primary email" },
  { key: "emails", type: "array", label: "All emails" },
  { key: "account", type: "object", label: "Account (id)" },
  { key: "phone_numbers", type: "array", label: "Phone numbers" },
  { key: "external_ids", type: "array", label: "External IDs" },
  { key: "custom_fields", type: "object", label: "Custom fields by slug" },
];

export const USER_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "User ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "email", type: "string", label: "Email" },
  { key: "status", type: "string", label: "active, away or out_of_office" },
  { key: "is_deactivated", type: "boolean", label: "Deactivated" },
  { key: "roles", type: "array", label: "Roles" },
];

export const TEAM_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Team ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "users", type: "array", label: "Members" },
  { key: "assignment_configuration", type: "object", label: "How issues are assigned" },
  { key: "schedule", type: "object", label: "Recurring assignment schedule" },
];

export const TAG_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Tag ID" },
  { key: "value", type: "string", label: "Tag value" },
  { key: "object_type", type: "string", label: "account, article or issue" },
  { key: "hex_color", type: "string", label: "Color" },
];

export const MESSAGE_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Message ID (use this to reply)" },
  { key: "thread_id", type: "string", label: "Thread ID" },
  { key: "message_html", type: "string", label: "Message (HTML)" },
  { key: "is_private", type: "boolean", label: "Internal note" },
  { key: "author", type: "object", label: "Author" },
  { key: "source", type: "string", label: "Source channel" },
  { key: "timestamp", type: "string", label: "Timestamp" },
];
