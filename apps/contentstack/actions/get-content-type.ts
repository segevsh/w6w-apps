import type { ActionDefinition } from "@w6w/types";
import { bool, BRANCH_PARAM, call, int, need, seg, str } from "../lib/client.ts";

/**
 * `GET /v3/content_types/{contentTypeUid}` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "get-content-type",
  type: "read",
  resource: "content_type",
  title: "Get Content Type",
  description: "One content type and its schema.",
  params: [
    {
      key: "contentTypeUid",
      label: "Content type UID",
      type: "string",
      required: true,
      hint: "UID of the content type, e.g. blog_post.",
    },
    {
      key: "version",
      label: "Version",
      type: "number",
      hint: "Content type version; latest when omitted.",
    },
    { key: "includeGlobalFieldSchema", label: "Include global field schema", type: "boolean" },
    BRANCH_PARAM,
  ],
  output: [
    { key: "content_type", type: "object", label: "Content type with its schema" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contentTypeUid = need("contentTypeUid", str(p.contentTypeUid));
    const version = int("version", p.version);
    const includeGlobalFieldSchema = bool(p.includeGlobalFieldSchema);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack Get Content Type", { contentTypeUid });
    return await call(ctx, "GET", `/content_types/${seg(contentTypeUid)}`, {
      query: { version, include_global_field_schema: includeGlobalFieldSchema },
      branch,
    });
  },
};

export default action;
