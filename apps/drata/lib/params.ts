import type { Option, Param } from "@w6w/types";

/**
 * Shared `Param` fragments and enum lists for the Drata actions. Every enum is
 * copied from the OpenAPI document (fetched 2026-10-05), not inferred.
 */

export const opts = (values: string[]): Option[] =>
  values.map((value) => ({ value, label: value }));

/** `expand[]` — Drata's v2 payloads are lean by default; related objects are opt-in. */
export const expandParam = (values: string[]): Param => ({
  key: "expand",
  label: "Expand",
  type: "multiselect",
  options: opts(values),
  hint: "Related objects to include. v2 responses omit them unless asked for " +
    "(sent as repeated `expand[]` query parameters).",
});

export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint: "Leave empty for the first page; pass the previous result's `nextCursor` for the next.",
};

/**
 * Drata defaults `size` to 50 and allows 500. A list of 500 personnel or risks with
 * nested objects is large, so the form prefills a smaller page.
 */
export const sizeParam: Param = {
  key: "size",
  label: "Page size",
  type: "number",
  default: 25,
  validation: { min: 1, max: 500, integer: true },
  hint: "1–500 (Drata's default is 50).",
};

export const totalCountParam: Param = {
  key: "includeTotalCount",
  label: "Include total count",
  type: "boolean",
  hint: "Adds `totalCount` to the result. Honoured only on the first page (no cursor).",
};

export const workspaceIdParam: Param = {
  key: "workspaceId",
  label: "Workspace ID",
  type: "number",
  required: true,
  hint: "Numeric id from the List Workspaces action.",
};

export const pageParams: Param[] = [cursorParam, sizeParam, totalCountParam];

export const renewalScheduleTypes = [
  "ONE_MONTH",
  "TWO_MONTHS",
  "THREE_MONTHS",
  "SIX_MONTHS",
  "ONE_YEAR",
  "CUSTOM",
  "NONE",
];

export const employmentStatuses = [
  "CURRENT_EMPLOYEE",
  "FORMER_EMPLOYEE",
  "CURRENT_CONTRACTOR",
  "FORMER_CONTRACTOR",
  "OUT_OF_SCOPE",
  "UNKNOWN",
  "SPECIAL_FORMER_EMPLOYEE",
  "SPECIAL_FORMER_CONTRACTOR",
  "FUTURE_HIRE",
  "SERVICE_ACCOUNT",
];

export const vendorCategories = [
  "ENGINEERING",
  "PRODUCT",
  "MARKETING",
  "CS",
  "SALES",
  "FINANCE",
  "HR",
  "ADMINISTRATIVE",
  "SECURITY",
  "LEGAL",
  "INFORMATION_TECHNOLOGY",
  "NONE",
];

export const vendorRisks = ["NONE", "LOW", "MODERATE", "HIGH"];

export const vendorTypes = ["VENDOR", "SUPPLIER", "CONTRACTOR", "PARTNER", "OTHER", "NONE"];

export const vendorStatuses = [
  "PROSPECTIVE",
  "ACTIVE",
  "ARCHIVED",
  "APPROVED",
  "REJECTED",
  "FLAGGED",
  "ON_HOLD",
  "OFFBOARDED",
  "UNDER_REVIEW",
  "NONE",
];

export const impactLevels = ["INSIGNIFICANT", "MINOR", "MODERATE", "MAJOR", "CRITICAL", "UNSCORED"];

export const treatmentPlans = ["UNTREATED", "ACCEPT", "TRANSFER", "AVOID", "MITIGATE"];

export const riskStatuses = ["ACTIVE", "ARCHIVED", "CLOSED"];

export const assetClassTypes = [
  "HARDWARE",
  "POLICY",
  "DOCUMENT",
  "PERSONNEL",
  "SOFTWARE",
  "CODE",
  "CONTAINER",
  "COMPUTE",
  "NETWORKING",
  "DATABASE",
  "STORAGE",
];

export const deviceSourceTypes = [
  "AGENT",
  "JAMF",
  "INTUNE",
  "KANDJI",
  "JUMPCLOUD",
  "HEXNODE_UEM",
  "UNKNOWN",
  "RIPPLING",
  "WORKSPACE_ONE",
  "KOLIDE",
  "CUSTOM",
  "INTUNE_GCC_HIGH",
  "CUSTOM_XFA",
  "NINJAONE",
];

export const complianceStatuses = ["MISCONFIGURED", "PASS", "FAIL", "EXCLUDED", "NOT_ASSESSED"];

export const checkResultStatuses = ["READY", "PASSED", "FAILED", "ERROR", "PREAUDIT"];

export const checkStatuses = ["UNUSED", "NEW", "ENABLED", "DISABLED", "TESTING"];

export const monitorTypes = [
  "POLICY",
  "IN_DRATA",
  "AGENT",
  "INFRASTRUCTURE",
  "VERSION_CONTROL",
  "IDENTITY",
  "TICKETING",
  "HRIS",
  "OBSERVABILITY",
  "CUSTOM",
];

export const testSources = ["DRATA", "CUSTOM", "EXTERNAL", "ACORN", "DRATA_LIBRARY"];

export const evidenceStatuses = [
  "NEEDS_ARTIFACT",
  "EXPIRED",
  "EXPIRING_SOON",
  "TEST_ERROR",
  "TEST_FAILED",
  "READY",
  "TEST_PASSED",
  "TEST_UNUSED",
  "TEST_DISABLED",
  "TEST_DELETED",
];

export const artifactTypes = [
  "URL",
  "S3_FILE",
  "TICKET_PROVIDER",
  "NONE",
  "GOOGLE_DRIVE",
  "ONE_DRIVE",
  "BOX",
  "DROPBOX",
  "SHARE_POINT",
  "TEST_RESULT",
];

export const policyStatuses = ["ACTIVE", "ARCHIVED", "REPLACED", "UNACCEPTABLE", "OUTDATED"];

export const assetTypes = ["PHYSICAL", "VIRTUAL"];

export const eventSources = [
  "APP",
  "AUTOPILOT",
  "PUBLIC_API",
  "VENDOR_QUESTIONNAIRE",
  "SCHEDULED",
  "WORKFLOW",
  "DRATA_POLICY",
  "AUDIT_AGENT",
];
