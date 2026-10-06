import type { ActionDefinition } from "@w6w/types";
import { BRANCH_PARAM, call, compact, need, seg, str, strList } from "../lib/client.ts";

/**
 * `POST /v3/releases/{releaseUid}/deploy` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "deploy-release",
  type: "perform",
  resource: "release",
  title: "Deploy Release",
  description: "Deploy a release to environments, now or on a schedule.",
  idempotent: false,
  params: [
    { key: "releaseUid", label: "Release UID", type: "string", required: true },
    {
      key: "action",
      label: "Action",
      type: "select",
      required: true,
      hint: "Publish or unpublish every pinned item.",
      options: [{ value: "publish", label: "publish" }, { value: "unpublish", label: "unpublish" }],
    },
    {
      key: "environments",
      label: "Environments",
      type: "string",
      required: true,
      hint: "Environment names, comma separated.",
    },
    { key: "locales", label: "Locales", type: "string", hint: "Locale codes, comma separated." },
    {
      key: "scheduledAt",
      label: "Scheduled at",
      type: "string",
      hint: "ISO 8601 time to schedule the deployment. Immediate when omitted.",
    },
    BRANCH_PARAM,
  ],
  output: [
    { key: "notice", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const releaseUid = need("releaseUid", str(p.releaseUid));
    const action = need("action", str(p.action));
    const environments = need("environments", strList(p.environments));
    const locales = strList(p.locales);
    const scheduledAt = str(p.scheduledAt);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack Deploy Release", { releaseUid });
    return await call(ctx, "POST", `/releases/${seg(releaseUid)}/deploy`, {
      body: { release: compact({ action, environments, locales, scheduled_at: scheduledAt }) },
      branch,
    });
  },
};

export default action;
