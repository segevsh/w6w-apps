import type { ActionDefinition } from "@w6w/types";
import { bool, BRANCH_PARAM, call, int, need, seg, str } from "../lib/client.ts";

/**
 * `GET /v3/assets/{assetUid}` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "get-asset",
  type: "read",
  resource: "asset",
  title: "Get Asset",
  description: "One asset by UID.",
  params: [
    { key: "assetUid", label: "Asset UID", type: "string", required: true },
    { key: "version", label: "Version", type: "number" },
    {
      key: "includePath",
      label: "Include path",
      type: "boolean",
      hint: "Include the full folder path.",
    },
    { key: "includePublishDetails", label: "Include publish details", type: "boolean" },
    BRANCH_PARAM,
  ],
  output: [
    { key: "asset", type: "object", label: "The asset" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const assetUid = need("assetUid", str(p.assetUid));
    const version = int("version", p.version);
    const includePath = bool(p.includePath);
    const includePublishDetails = bool(p.includePublishDetails);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack Get Asset", { assetUid });
    return await call(ctx, "GET", `/assets/${seg(assetUid)}`, {
      query: { version, include_path: includePath, include_publish_details: includePublishDetails },
      branch,
    });
  },
};

export default action;
