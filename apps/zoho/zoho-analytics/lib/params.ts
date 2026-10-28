import type { Param } from "@w6w/types";

export const organizationId: Param = {
  key: "organizationId",
  label: "Organization ID",
  type: "string",
  advanced: true,
  hint: "Zoho Analytics organization id (sent as the ZANALYTICS-ORGID header). Falls back to the " +
    "one recorded when this connection was authorized. Run List Owned Workspaces to see every " +
    "id available.",
};

export const workspaceId: Param = {
  key: "workspaceId",
  label: "Workspace ID",
  type: "string",
  required: true,
  hint: "Run List Owned Workspaces or List Shared Workspaces to find one.",
};

export const viewId: Param = {
  key: "viewId",
  label: "View/Table ID",
  type: "string",
  required: true,
  hint: "The table or view id within the workspace, as shown in Zoho Analytics.",
};

export const criteria: Param = {
  key: "criteria",
  label: "Criteria",
  type: "string",
  advanced: true,
  hint:
    "SQL-WHERE-style filter, e.g. \"Region\"='East'. Column and table names in double quotes, " +
    "string values in single quotes.",
};

export const dateFormatParams: Param[] = [
  {
    key: "dateFormat",
    label: "Date format",
    type: "string",
    advanced: true,
    hint: 'Only if a date column\'s format cannot be auto-recognized, e.g. "dd-MMM-yyyy".',
  },
  {
    key: "columnDateFormat",
    label: "Per-column date formats",
    type: "json",
    advanced: true,
    hint: "JSON object of column name -> date format, for multiple differently-formatted date " +
      'columns, e.g. {"Signup Date":"dd-MMM-yyyy"}.',
  },
];
