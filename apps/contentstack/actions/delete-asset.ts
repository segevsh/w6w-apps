import type { ActionDefinition } from "@w6w/types";
import { BRANCH_PARAM, call, need, seg, str } from "../lib/client.ts";

/**
 * `DELETE /v3/assets/{assetUid}` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "delete-asset",
  type: "perform",
  resource: "asset",
  title: "Delete Asset",
  description: "Delete an asset.",
  idempotent: true,
  params: [
    { key: "assetUid", label: "Asset UID", type: "string", required: true },
    BRANCH_PARAM,
  ],
  output: [
    { key: "notice", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const assetUid = need("assetUid", str(p.assetUid));
    const branch = str(p.branch);
    ctx.log("info", "Contentstack Delete Asset", { assetUid });
    return await call(ctx, "DELETE", `/assets/${seg(assetUid)}`, { branch });
  },
};

export default action;
