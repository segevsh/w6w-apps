import type { ActionDefinition } from "@w6w/types";
import { bool, call, int } from "../lib/client.ts";

/**
 * `GET /v3/stacks/branches` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "list-branches",
  type: "read",
  resource: "branch",
  title: "List Branches",
  description: "Branches of the stack.",
  params: [
    {
      key: "includeCount",
      label: "Include count",
      type: "boolean",
      hint: "Include the total count in the response.",
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
  ],
  output: [
    { key: "branches", type: "array", label: "Branches" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const includeCount = bool(p.includeCount);
    const limit = int("limit", p.limit);
    const skip = int("skip", p.skip);
    ctx.log("info", "Contentstack List Branches");
    return await call(ctx, "GET", "/stacks/branches", {
      query: { include_count: includeCount, limit, skip },
    });
  },
};

export default action;
