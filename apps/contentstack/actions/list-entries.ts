import type { ActionDefinition } from "@w6w/types";
import { bool, BRANCH_PARAM, call, int, jsonObject, need, seg, str } from "../lib/client.ts";

/**
 * `GET /v3/content_types/{contentTypeUid}/entries` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "list-entries",
  type: "read",
  resource: "entry",
  title: "List Entries",
  description: "Entries of a content type (the API returns up to 100 per call; page with skip).",
  params: [
    {
      key: "contentTypeUid",
      label: "Content type UID",
      type: "string",
      required: true,
      hint: "UID of the content type, e.g. blog_post.",
    },
    {
      key: "locale",
      label: "Locale",
      type: "string",
      hint: "Locale code; the master locale when omitted.",
    },
    {
      key: "query",
      label: "Query",
      type: "json",
      hint:
        'A query as a JSON object, e.g. {"title": "Home"}. Supported operators follow the Content Delivery API Queries reference.',
    },
    {
      key: "includeCount",
      label: "Include count",
      type: "boolean",
      hint: "Include the total count in the response.",
    },
    { key: "includeWorkflow", label: "Include workflow", type: "boolean" },
    { key: "includePublishDetails", label: "Include publish details", type: "boolean" },
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
    { key: "entries", type: "array", label: "Entries" },
    { key: "count", type: "number", label: "Total count, when requested" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contentTypeUid = need("contentTypeUid", str(p.contentTypeUid));
    const locale = str(p.locale);
    const query = jsonObject("query", p.query);
    const includeCount = bool(p.includeCount);
    const includeWorkflow = bool(p.includeWorkflow);
    const includePublishDetails = bool(p.includePublishDetails);
    const limit = int("limit", p.limit);
    const skip = int("skip", p.skip);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack List Entries", { contentTypeUid });
    return await call(ctx, "GET", `/content_types/${seg(contentTypeUid)}/entries`, {
      query: {
        locale,
        query,
        include_count: includeCount,
        include_workflow: includeWorkflow,
        include_publish_details: includePublishDetails,
        limit,
        skip,
      },
      branch,
    });
  },
};

export default action;
