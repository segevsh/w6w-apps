import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient } from "../lib/client.ts";
import { BODY_FORMAT_PARAM } from "../lib/params.ts";

/**
 * `GET /wiki/api/v2/pages/{id}` — verified against Confluence Cloud's REST API
 * v2 OpenAPI document (`getPageById`).
 */
const action: ActionDefinition = {
  key: "page-get",
  type: "read",
  resource: "page",
  title: "Get a page",
  description: "Retrieve one page, optionally including its body, labels or version history.",
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true, default: "" },
    { ...BODY_FORMAT_PARAM, default: "storage" },
    {
      key: "version",
      label: "Version",
      type: "number",
      default: null,
      hint: "Retrieve a specific earlier version instead of the current one.",
    },
    { key: "includeLabels", label: "Include Labels", type: "boolean", default: false },
    { key: "includeVersion", label: "Include Version", type: "boolean", default: true },
  ],
  output: [
    { key: "id", type: "string", label: "Page ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "spaceId", type: "string", label: "Space ID" },
    { key: "parentId", type: "string", label: "Parent ID" },
    { key: "authorId", type: "string", label: "Author account ID" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "version", type: "object", label: "Version" },
    { key: "body", type: "object", label: "Body" },
    { key: "_links", type: "object", label: "Links" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const pageId = String(p.pageId ?? "").trim();
    if (!pageId) throw new Error("`pageId` is required");

    const client = new ConfluenceClient(ctx);
    ctx.log("info", "getting Confluence page", { pageId });

    return await client.request(`/pages/${encodeURIComponent(pageId)}`, {
      query: {
        // Defaults to storage — a read that silently omits the body is a
        // surprise, and storage is the format Confluence itself keeps.
        "body-format": (p.bodyFormat as string) || "storage",
        version: typeof p.version === "number" ? p.version : undefined,
        "include-labels": p.includeLabels === true ? "true" : undefined,
        // Defaults on, because the version number is what `page-update` needs.
        "include-version": p.includeVersion === false ? "false" : "true",
      },
    });
  },
};

export default action;
