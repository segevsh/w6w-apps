import pageCommentList from "../actions/page-comment-list.ts";
import { newestFirst, paramsOf } from "../lib/triggers.ts";

/**
 * Wraps `page-comment-list` (footer comments) for the page the user picks, with
 * `sort=-created-date` (documented `sort` enum of GET /wiki/api/v2/pages/{id}/footer-comments:
 * `created-date`, `modified-date` and their `-` forms;
 * https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-comment/, verified 2026-11-10).
 */
export default newestFirst({
  key: "new-page-comment",
  title: "New Page Comment",
  description: "The run gets each new footer comment on the selected page.",
  action: pageCommentList,
  sort: "-created-date",
  parent: ["pageId"],
  params: paramsOf(pageCommentList, "pageId"),
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "pageId", type: "string", label: "Page ID" },
    { key: "version", type: "object", label: "Comment version (author and created time)" },
  ],
  sample: {
    id: "comment-101",
    pageId: "page-101",
    version: { number: 1, createdAt: "2026-11-09T09:00:00.000Z" },
  },
});
