import type { ActionDefinition } from "@w6w/types";
import { bool, BRANCH_PARAM, call, int, need, seg, str } from "../lib/client.ts";

/**
 * `GET /v3/content_types/{contentTypeUid}/entries/{entryUid}` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "get-entry",
  type: "read",
  resource: "entry",
  title: "Get Entry",
  description: "One entry by UID.",
  params: [
    {
      key: "contentTypeUid",
      label: "Content type UID",
      type: "string",
      required: true,
      hint: "UID of the content type, e.g. blog_post.",
    },
    { key: "entryUid", label: "Entry UID", type: "string", required: true },
    { key: "locale", label: "Locale", type: "string" },
    {
      key: "version",
      label: "Version",
      type: "number",
      hint: "Entry version; latest when omitted.",
    },
    { key: "includeWorkflow", label: "Include workflow", type: "boolean" },
    { key: "includePublishDetails", label: "Include publish details", type: "boolean" },
    BRANCH_PARAM,
  ],
  output: [
    { key: "entry", type: "object", label: "The entry" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contentTypeUid = need("contentTypeUid", str(p.contentTypeUid));
    const entryUid = need("entryUid", str(p.entryUid));
    const locale = str(p.locale);
    const version = int("version", p.version);
    const includeWorkflow = bool(p.includeWorkflow);
    const includePublishDetails = bool(p.includePublishDetails);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack Get Entry", { contentTypeUid, entryUid });
    return await call(
      ctx,
      "GET",
      `/content_types/${seg(contentTypeUid)}/entries/${seg(entryUid)}`,
      {
        query: {
          locale,
          version,
          include_workflow: includeWorkflow,
          include_publish_details: includePublishDetails,
        },
        branch,
      },
    );
  },
};

export default action;
