import type { ActionDefinition } from "@w6w/types";
import { bool, BRANCH_PARAM, call, int, jsonObject, str } from "../lib/client.ts";

/**
 * `GET /v3/assets` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "list-assets",
  type: "read",
  resource: "asset",
  title: "List Assets",
  description: "Assets in the stack, optionally within a folder (up to 100 per call).",
  params: [
    {
      key: "folder",
      label: "Folder",
      type: "string",
      hint: "Folder UID, or cs_root for the top level.",
    },
    { key: "includeFolders", label: "Include folders", type: "boolean" },
    {
      key: "environment",
      label: "Environment",
      type: "string",
      hint: "Only assets published to this environment.",
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
    { key: "includePublishDetails", label: "Include publish details", type: "boolean" },
    { key: "asc", label: "Asc", type: "string", hint: "Field UID to sort ascending by." },
    { key: "desc", label: "Desc", type: "string", hint: "Field UID to sort descending by." },
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
    { key: "assets", type: "array", label: "Assets" },
    { key: "count", type: "number", label: "Total count, when requested" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const folder = str(p.folder);
    const includeFolders = bool(p.includeFolders);
    const environment = str(p.environment);
    const query = jsonObject("query", p.query);
    const includeCount = bool(p.includeCount);
    const includePublishDetails = bool(p.includePublishDetails);
    const asc = str(p.asc);
    const desc = str(p.desc);
    const limit = int("limit", p.limit);
    const skip = int("skip", p.skip);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack List Assets");
    return await call(ctx, "GET", "/assets", {
      query: {
        folder,
        include_folders: includeFolders,
        environment,
        query,
        include_count: includeCount,
        include_publish_details: includePublishDetails,
        asc,
        desc,
        limit,
        skip,
      },
      branch,
    });
  },
};

export default action;
