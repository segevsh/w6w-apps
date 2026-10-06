import type { ActionDefinition } from "@w6w/types";
import { bool, BRANCH_PARAM, call, int, str } from "../lib/client.ts";

/**
 * `GET /v3/releases` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "list-releases",
  type: "read",
  resource: "release",
  title: "List Releases",
  description: "Releases in the stack.",
  params: [
    {
      key: "includeCount",
      label: "Include count",
      type: "boolean",
      hint: "Include the total count in the response.",
    },
    {
      key: "includeItemsCount",
      label: "Include items count",
      type: "boolean",
      hint: "Include the number of items in each release.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Page size. The API returns at most 100 items per call.",
    },
    {
      key: "skip",
      label: "Skip",
      type: "number",
      hint: "Number of items to skip, for paging past the first 100.",
    },
    BRANCH_PARAM,
  ],
  output: [
    { key: "releases", type: "array", label: "Releases" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const includeCount = bool(p.includeCount);
    const includeItemsCount = bool(p.includeItemsCount);
    const limit = int("limit", p.limit);
    const skip = int("skip", p.skip);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack List Releases");
    return await call(ctx, "GET", "/releases", {
      query: { include_count: includeCount, include_items_count: includeItemsCount, limit, skip },
      branch,
    });
  },
};

export default action;
