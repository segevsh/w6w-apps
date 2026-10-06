import type { ActionDefinition } from "@w6w/types";
import { bool, BRANCH_PARAM, call, int, str } from "../lib/client.ts";

/**
 * `GET /v3/content_types` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "list-content-types",
  type: "read",
  resource: "content_type",
  title: "List Content Types",
  description: "Content types in the stack (the API returns up to 100 per call).",
  params: [
    {
      key: "includeCount",
      label: "Include count",
      type: "boolean",
      hint: "Include the total count in the response.",
    },
    {
      key: "includeGlobalFieldSchema",
      label: "Include global field schema",
      type: "boolean",
      hint: "Expand the schema of global fields used by each content type.",
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
    { key: "content_types", type: "array", label: "Content types" },
    { key: "count", type: "number", label: "Total count, when requested" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const includeCount = bool(p.includeCount);
    const includeGlobalFieldSchema = bool(p.includeGlobalFieldSchema);
    const limit = int("limit", p.limit);
    const skip = int("skip", p.skip);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack List Content Types");
    return await call(ctx, "GET", "/content_types", {
      query: {
        include_count: includeCount,
        include_global_field_schema: includeGlobalFieldSchema,
        limit,
        skip,
      },
      branch,
    });
  },
};

export default action;
