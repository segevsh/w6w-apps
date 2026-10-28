import type { ActionDefinition } from "@w6w/types";
import { compact, ConfluenceClient, contentBody } from "../lib/client.ts";

/**
 * `POST /wiki/api/v2/footer-comments` — verified against Confluence Cloud's
 * REST API v2 OpenAPI document (`createFooterComment`).
 *
 * The schema marks nothing required, but the target is: the body carries
 * exactly one of `pageId`, `blogPostId`, `attachmentId`, `customContentId` (a
 * top-level comment) or `parentCommentId` (a reply). This action exposes the
 * three a workflow reaches for and enforces the "exactly one" rule locally,
 * because Confluence's own error for getting it wrong names none of them.
 */
const action: ActionDefinition = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Add a comment",
  description: "Add a footer comment to a page or blog post, or reply to another comment.",
  // Two calls post two comments.
  idempotent: false,
  params: [
    {
      key: "pageId",
      label: "Page ID",
      type: "string",
      default: "",
      hint: "Comment on a page. Set exactly one of Page / Blog Post / Parent Comment.",
    },
    { key: "blogPostId", label: "Blog Post ID", type: "string", default: "" },
    {
      key: "parentCommentId",
      label: "Parent Comment ID",
      type: "string",
      default: "",
      hint: "Reply to an existing comment instead of starting a thread.",
    },
    { key: "body", label: "Comment", type: "text", required: true, default: "" },
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
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "pageId", type: "string", label: "Page ID" },
    { key: "blogPostId", type: "string", label: "Blog post ID" },
    { key: "parentCommentId", type: "string", label: "Parent comment ID" },
    { key: "version", type: "object", label: "Version" },
    { key: "body", type: "object", label: "Body" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const targets = ["pageId", "blogPostId", "parentCommentId"].filter((k) =>
      String(p[k] ?? "").trim()
    );
    if (targets.length === 0) {
      throw new Error("set one of `pageId`, `blogPostId` or `parentCommentId`");
    }
    if (targets.length > 1) {
      throw new Error(`set only one target — got ${targets.join(", ")}`);
    }
    const text = String(p.body ?? "").trim();
    if (!text) throw new Error("`body` is required");

    const body = compact({
      pageId: p.pageId,
      blogPostId: p.blogPostId,
      parentCommentId: p.parentCommentId,
      body: contentBody(text, (p.representation as string) || "storage"),
    });

    const client = new ConfluenceClient(ctx);
    ctx.log("info", "creating Confluence comment", { target: targets[0] });

    return await client.request("/footer-comments", { method: "POST", body });
  },
};

export default action;
