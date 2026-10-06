import type { ActionDefinition } from "@w6w/types";
import { BRANCH_PARAM, call, compact, int, need, seg, str, strList } from "../lib/client.ts";

/**
 * `POST /v3/assets/{assetUid}/unpublish` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "unpublish-asset",
  type: "perform",
  resource: "asset",
  title: "Unpublish Asset",
  description: "Unpublish an asset from environments and locales.",
  idempotent: true,
  params: [
    { key: "assetUid", label: "Asset UID", type: "string", required: true },
    {
      key: "environments",
      label: "Environments",
      type: "string",
      required: true,
      hint: "Environment names, comma separated.",
    },
    {
      key: "locales",
      label: "Locales",
      type: "string",
      hint: "Locale codes, comma separated (e.g. en-us,fr-fr).",
    },
    { key: "version", label: "Version", type: "number" },
    {
      key: "scheduledAt",
      label: "Scheduled at",
      type: "string",
      hint: "ISO 8601 time to schedule the action. Immediate when omitted.",
    },
    BRANCH_PARAM,
  ],
  output: [
    { key: "notice", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const assetUid = need("assetUid", str(p.assetUid));
    const environments = need("environments", strList(p.environments));
    const locales = strList(p.locales);
    const version = int("version", p.version);
    const scheduledAt = str(p.scheduledAt);
    const branch = str(p.branch);
    const top = compact({ version, scheduled_at: scheduledAt });
    ctx.log("info", "Contentstack Unpublish Asset", { assetUid });
    return await call(ctx, "POST", `/assets/${seg(assetUid)}/unpublish`, {
      body: { asset: compact({ environments, locales }), ...top },
      branch,
    });
  },
};

export default action;
