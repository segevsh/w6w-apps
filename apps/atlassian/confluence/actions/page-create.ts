import type { ActionDefinition } from "@w6w/types";
import { compact, ConfluenceClient, contentBody } from "../lib/client.ts";

/**
 * `POST /wiki/api/v2/pages` — verified against Confluence Cloud's REST API v2
 * OpenAPI document (`createPage`; body requires `spaceId`, and `title` is
 * required whenever the status is not `draft`).
 */
const action: ActionDefinition = {
  key: "page-create",
  type: "perform",
  resource: "page",
  title: "Create a page",
  description: "Create a page in a space, optionally under a parent page.",
  // Two calls make two pages — Confluence allows same-titled pages in
  // different parents and does not dedupe.
  idempotent: false,
  params: [
    {
      key: "spaceId",
      label: "Space ID",
      type: "string",
      required: true,
      default: "",
      hint: "The numeric space ID, from List spaces — not the space key.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      default: "",
      hint: "Required unless the status is draft.",
    },
    {
      key: "parentId",
      label: "Parent Page ID",
      type: "string",
      default: "",
      hint: "Leave blank to put the page under the space homepage — Confluence's default.",
    },
    {
      key: "rootLevel",
      label: "Create at Space Root",
      type: "boolean",
      default: false,
      hint: "Place the page outside the space homepage tree. Cannot be combined with a parent.",
    },
    { key: "body", label: "Body", type: "text", default: "" },
    {
      key: "representation",
      label: "Body Format",
      type: "select",
      default: "storage",
      options: [
        { value: "storage", label: "Storage (XHTML)" },
        { value: "wiki", label: "Wiki markup" },
        { value: "atlas_doc_format", label: "Atlassian Document Format" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "current",
      options: [
        { value: "current", label: "Published" },
        { value: "draft", label: "Draft" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Page ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "spaceId", type: "string", label: "Space ID" },
    { key: "parentId", type: "string", label: "Parent ID" },
    { key: "version", type: "object", label: "Version" },
    { key: "_links", type: "object", label: "Links" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const spaceId = String(p.spaceId ?? "").trim();
    const title = String(p.title ?? "").trim();
    const status = (p.status as string) || "current";
    if (!spaceId) throw new Error("`spaceId` is required");
    if (p.rootLevel === true && p.parentId) {
      throw new Error("`rootLevel` and `parentId` are mutually exclusive");
    }
    if (!title && status !== "draft") {
      throw new Error("`title` is required unless the page is a draft");
    }

    const body = compact({
      spaceId,
      status,
      title: title || undefined,
      parentId: p.parentId,
      body: contentBody(p.body, (p.representation as string) || "storage"),
    });

    const client = new ConfluenceClient(ctx);
    ctx.log("info", "creating Confluence page", { spaceId, title });

    return await client.request("/pages", {
      method: "POST",
      body,
      // The two are mutually exclusive by Confluence's own rule: "If [root-level
      // is] true, then a value may not be supplied for the `parentId` body
      // parameter." Omitting both puts the page under the space homepage.
      query: { "root-level": p.rootLevel === true ? "true" : undefined },
    });
  },
};

export default action;
