import type { Param } from "@w6w/types";

/**
 * Every Zoho Creator v2 data/meta endpoint is scoped in its URL path to a specific
 * `<account_owner_name>/<app_link_name>` — there is no account-wide "default app" the
 * way Zoho Books/Analytics have a default organization/workspace, and a single
 * connection can read/write many different owners' apps across a shared token's
 * access. So these are required per-action params, never a connection field — run
 * `application-list` to discover the `workspace_name` (= `account_owner_name`) and
 * `link_name` (= `app_link_name`) for every app this connection can reach.
 */
export const accountOwnerName: Param = {
  key: "accountOwnerName",
  label: "Account Owner Name",
  type: "string",
  required: true,
  hint: "The Zoho Creator account owner's username. Run List Applications to see it as " +
    '"workspace_name" for each app this connection can access.',
};

export const appLinkName: Param = {
  key: "appLinkName",
  label: "App Link Name",
  type: "string",
  required: true,
  hint: 'The target application\'s link name. Run List Applications to see it as "link_name".',
};

export const formLinkName: Param = {
  key: "formLinkName",
  label: "Form Link Name",
  type: "string",
  required: true,
  hint: 'The target form\'s link name. Run List Forms to see it as "link_name".',
};

export const reportLinkName: Param = {
  key: "reportLinkName",
  label: "Report Link Name",
  type: "string",
  required: true,
  hint: 'The target report\'s link name. Run List Reports to see it as "link_name".',
};

export const recordId: Param = {
  key: "recordId",
  label: "Record ID",
  type: "string",
  required: true,
  hint: 'The ID of the record, as returned in a record\'s "ID" field.',
};

export const fieldLinkName: Param = {
  key: "fieldLinkName",
  label: "Field Link Name",
  type: "string",
  required: true,
  hint: "The target file upload/image/audio/video/signature field's link name. Run List " +
    'Fields to see it as "link_name".',
};

export const criteria: Param = {
  key: "criteria",
  label: "Criteria",
  type: "string",
  advanced: true,
  hint: 'Filter expression, e.g. Name.last_name=="Boyle" or Total>=100.00. String values in ' +
    "double quotes, date/time values in single quotes. Combine with && / || / !.",
};

export const environmentParam: Param = {
  key: "environment",
  label: "Environment",
  type: "select",
  advanced: true,
  hint: "Test against a development/stage form or report instead of production. Omit for " +
    "production (the default).",
  options: [
    { value: "development", label: "Development" },
    { value: "stage", label: "Stage" },
  ],
};

export const demoUserName: Param = {
  key: "demoUserName",
  label: "Demo user name",
  type: "string",
  advanced: true,
  hint: 'A demo user configured on this app (e.g. "demouser_1"), used together with ' +
    "Environment to test as that user.",
};

export const processUntilLimit: Param = {
  key: "processUntilLimit",
  label: "Process first 200 only",
  type: "boolean",
  advanced: true,
  default: false,
  hint: "When more than 200 records match the criteria, the request fails unless this is set " +
    "— it then processes the first 200 and reports moreRecords: true so you can loop.",
};

export const messageParam: Param = {
  key: "message",
  label: "Return the configured success message",
  type: "boolean",
  advanced: true,
  default: false,
};

export const tasksParam: Param = {
  key: "tasks",
  label: "Return redirection details",
  type: "boolean",
  advanced: true,
  default: false,
  hint: "Include the form/report/page/URL this record's Direct to Form property or a " +
    "workflow's Show Message action would redirect to.",
};
