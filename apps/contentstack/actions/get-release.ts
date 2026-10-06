import type { ActionDefinition } from "@w6w/types";
import { BRANCH_PARAM, call, need, seg, str } from "../lib/client.ts";

/**
 * `GET /v3/releases/{releaseUid}` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "get-release",
  type: "read",
  resource: "release",
  title: "Get Release",
  description: "One release by UID.",
  params: [
    { key: "releaseUid", label: "Release UID", type: "string", required: true },
    BRANCH_PARAM,
  ],
  output: [
    { key: "release", type: "object", label: "The release" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const releaseUid = need("releaseUid", str(p.releaseUid));
    const branch = str(p.branch);
    ctx.log("info", "Contentstack Get Release", { releaseUid });
    return await call(ctx, "GET", `/releases/${seg(releaseUid)}`, { branch });
  },
};

export default action;
