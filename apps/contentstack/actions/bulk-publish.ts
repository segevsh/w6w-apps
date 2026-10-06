import type { ActionDefinition } from "@w6w/types";
import { bool, BRANCH_PARAM, call, compact, jsonArray, need, str, strList } from "../lib/client.ts";

/**
 * `POST /v3/bulk/publish` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "bulk-publish",
  type: "perform",
  resource: "bulk",
  title: "Bulk Publish",
  description:
    "Publish up to 10 entries and assets to environments in one request (1 request per second).",
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
    {
      key: "publishWithReference",
      label: "Publish with reference",
      type: "boolean",
      hint: "Also publish one level of referenced entries.",
    },
    {
      key: "skipWorkflowStageCheck",
      label: "Skip workflow stage check",
      type: "boolean",
      hint:
        "Skip items that have not reached their publish-rule stage instead of failing the whole request.",
    },
    {
      key: "approvals",
      label: "Approvals",
      type: "boolean",
      hint: "Skip items without approval instead of failing the whole request.",
    },
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
    const publishWithReference = bool(p.publishWithReference);
    const skipWorkflowStageCheck = bool(p.skipWorkflowStageCheck);
    const approvals = bool(p.approvals);
    const branch = str(p.branch);
    const top = compact({ publish_with_reference: publishWithReference });
    ctx.log("info", "Contentstack Bulk Publish");
    return await call(ctx, "POST", "/bulk/publish", {
      query: { skip_workflow_stage_check: skipWorkflowStageCheck, approvals },
      body: compact({ entries, assets, locales, environments, ...top }),
      branch,
      headers: { api_version: "3.2" },
    });
  },
};

export default action;
