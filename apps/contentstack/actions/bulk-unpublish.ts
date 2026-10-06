import type { ActionDefinition } from "@w6w/types";
import { bool, BRANCH_PARAM, call, compact, jsonArray, need, str, strList } from "../lib/client.ts";

/**
 * `POST /v3/bulk/unpublish` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "bulk-unpublish",
  type: "perform",
  resource: "bulk",
  title: "Bulk Unpublish",
  description: "Unpublish up to 10 entries and assets from environments in one request.",
  idempotent: true,
  params: [
    {
      key: "entries",
      label: "Entries",
      type: "json",
      hint: "JSON array of {uid, content_type, locale, version?}.",
    },
    { key: "assets", label: "Assets", type: "json", hint: "JSON array of {uid, version?}." },
    {
      key: "locales",
      label: "Locales",
      type: "string",
      hint: "Locale codes, comma separated (e.g. en-us,fr-fr).",
    },
    {
      key: "environments",
      label: "Environments",
      type: "string",
      required: true,
      hint: "Environment names, comma separated.",
    },
    { key: "skipWorkflowStageCheck", label: "Skip workflow stage check", type: "boolean" },
    { key: "approvals", label: "Approvals", type: "boolean" },
    BRANCH_PARAM,
  ],
  output: [
    { key: "notice", type: "string", label: "Vendor message" },
    { key: "job_id", type: "string", label: "Job id; poll it with Get Job Status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const entries = jsonArray("entries", p.entries);
    const assets = jsonArray("assets", p.assets);
    const locales = strList(p.locales);
    const environments = need("environments", strList(p.environments));
    const skipWorkflowStageCheck = bool(p.skipWorkflowStageCheck);
    const approvals = bool(p.approvals);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack Bulk Unpublish");
    return await call(ctx, "POST", "/bulk/unpublish", {
      query: { skip_workflow_stage_check: skipWorkflowStageCheck, approvals },
      body: compact({ entries, assets, locales, environments }),
      branch,
      headers: { api_version: "3.2" },
    });
  },
};

export default action;
