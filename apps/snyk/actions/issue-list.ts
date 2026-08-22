import type { ActionDefinition } from "@w6w/types";
import { csv, resolveOrg, SnykClient } from "../lib/client.ts";
import { LIST_PARAMS, ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /orgs/{org_id}/issues` — verified against Snyk's own API document
 * (`listOrgIssues`).
 *
 * The core of the app: the vulnerabilities Snyk found. Note
 * `effective_severity_level` rather than a plain `severity` — Snyk
 * distinguishes an issue's inherent severity from the one that applies after
 * the org's policies and ignores are taken into account, and the effective one
 * is what a triage workflow should filter on.
 */
const action: ActionDefinition = {
  key: "issue-list",
  type: "read",
  resource: "issue",
  title: "List issues",
  description: "List an organization's issues, filtered by severity, status, type or date.",
  params: [
    ORG_PARAM,
    ...LIST_PARAMS,
    {
      key: "effectiveSeverityLevel",
      label: "Severity",
      type: "multiselect",
      default: [],
      options: [
        { value: "critical", label: "Critical" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
        { value: "info", label: "Info" },
      ],
      hint: "Snyk's effective severity — after policies and ignores are applied.",
    },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      default: [],
      options: [
        { value: "open", label: "Open" },
        { value: "resolved", label: "Resolved" },
      ],
    },
    {
      key: "type",
      label: "Type",
      type: "string",
      default: "",
      placeholder: "package_vulnerability",
      hint: "e.g. package_vulnerability, license, cloud, code, custom.",
    },
    {
      key: "ignored",
      label: "Ignored",
      type: "boolean",
      default: null,
      hint: "Leave unset for both ignored and non-ignored issues.",
    },
    { key: "createdAfter", label: "Created After", type: "datetime", default: "" },
    { key: "updatedAfter", label: "Updated After", type: "datetime", default: "" },
    {
      key: "scanItemId",
      label: "Scan Item ID",
      type: "string",
      default: "",
      hint: "Filter to one project or target — pair with Scan Item Type.",
    },
    {
      key: "scanItemType",
      label: "Scan Item Type",
      type: "select",
      default: "",
      options: [
        { value: "project", label: "Project" },
        { value: "environment", label: "Environment" },
      ],
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new SnykClient(ctx);
    const org = resolveOrg(ctx.connection, p.orgId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const query = {
      effective_severity_level: csv(p.effectiveSeverityLevel),
      status: csv(p.status),
      type: (p.type as string) || undefined,
      ignored: typeof p.ignored === "boolean" ? String(p.ignored) : undefined,
      created_after: (p.createdAfter as string) || undefined,
      updated_after: (p.updatedAfter as string) || undefined,
      "scan_item.id": (p.scanItemId as string) || undefined,
      "scan_item.type": (p.scanItemType as string) || undefined,
    };

    ctx.log("info", "listing Snyk issues", { org, returnAll, limit });

    return await client.requestAll(
      `/orgs/${encodeURIComponent(org)}/issues`,
      { query },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
