import type { ActionDefinition } from "@w6w/types";
import { compact, ConfluenceClient, contentBody } from "../lib/client.ts";

/**
 * `PUT /wiki/api/v2/pages/{id}` — verified against Confluence Cloud's REST API
 * v2 OpenAPI document (`updatePage`). Its body requires **all five** of `id`,
 * `status`, `title`, `body` and `version`.
 *
 * **Confluence updates are optimistically locked.** `version.number` must be
 * exactly the current version plus one, or the write is rejected — which makes
 * a naive "just set the title" action impossible to use without first reading
 * the page. So when `versionNumber` is left blank this action fetches the page
 * (`include-version=true`), takes its number and increments. That costs one
 * extra GET and is not race-proof: two concurrent updates still collide, and
 * Confluence rejecting the second one is the correct outcome. Pass
 * `versionNumber` explicitly to control it yourself.
 *
 * The same read supplies `title` and `body` when the caller only wants to
 * change one of them — the endpoint is a full replace, so omitting either
 * would blank it.
 */
const action: ActionDefinition = {
  key: "page-update",
  type: "perform",
  resource: "page",
  title: "Update a page",
  description: "Change a page's title, body, status or parent.",
  // Replaying the same body fails on the version check rather than
  // double-applying, and the intended end state is reached once.
  idempotent: true,
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true, default: "" },
    {
      key: "title",
      label: "Title",
      type: "string",
      default: "",
      hint: "Leave blank to keep the current title.",
    },
    {
      key: "body",
      label: "Body",
      type: "text",
      default: "",
      hint: "Leave blank to keep the current body. This endpoint replaces, it does not append.",
    },
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
    {
      key: "parentId",
      label: "Parent Page ID",
      type: "string",
      default: "",
      hint: "Set to move the page under a different parent.",
    },
    {
      key: "versionNumber",
      label: "Version Number",
      type: "number",
      default: null,
      hint: "The NEW version number — current + 1. Leave blank to read and increment it.",
    },
    { key: "versionMessage", label: "Version Message", type: "string", default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Page ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "spaceId", type: "string", label: "Space ID" },
    { key: "parentId", type: "string", label: "Parent ID" },
    { key: "version", type: "object", label: "Version" },
    { key: "body", type: "object", label: "Body" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const pageId = String(p.pageId ?? "").trim();
    if (!pageId) throw new Error("`pageId` is required");

    const client = new ConfluenceClient(ctx);
    const representation = (p.representation as string) || "storage";
    let title = String(p.title ?? "").trim();
    let bodyValue = p.body as string | undefined;
    let versionNumber = typeof p.versionNumber === "number" ? p.versionNumber : undefined;

    // One read covers all three things the endpoint demands but the caller may
    // not have supplied: the next version number, and whichever of title/body
    // is being left alone.
    if (versionNumber === undefined || !title || !bodyValue) {
      const current = await client.request<{
        title?: string;
        version?: { number?: number };
        body?: Record<string, { value?: string }>;
      }>(`/pages/${encodeURIComponent(pageId)}`, {
        query: { "body-format": representation, "include-version": "true" },
      });
      if (versionNumber === undefined) {
        const n = current?.version?.number;
        if (typeof n !== "number") {
          throw new Error(
            "could not read the page's current version — pass `versionNumber` explicitly",
          );
        }
        versionNumber = n + 1;
      }
      if (!title) title = current?.title ?? "";
      if (!bodyValue) bodyValue = current?.body?.[representation]?.value ?? "";
    }

    const body = compact({
      id: pageId,
      status: (p.status as string) || "current",
      title,
      parentId: p.parentId,
      body: contentBody(bodyValue, representation) ?? { representation, value: "" },
      version: compact({ number: versionNumber, message: p.versionMessage }),
    });

    ctx.log("info", "updating Confluence page", { pageId, version: versionNumber });

    return await client.request(`/pages/${encodeURIComponent(pageId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default action;
