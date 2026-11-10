import pageAttachmentList from "../actions/page-attachment-list.ts";
import { newestFirst, paramsOf } from "../lib/triggers.ts";

/**
 * Wraps `page-attachment-list` for the page the user picks, with `sort=-created-date` (documented
 * `sort` enum of GET /wiki/api/v2/pages/{id}/attachments: `created-date`, `modified-date` and their
 * `-` forms; https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-attachment/,
 * verified 2026-11-10).
 */
export default newestFirst({
  key: "new-page-attachment",
  title: "New Page Attachment",
  description: "The run gets each file newly attached to the selected page.",
  action: pageAttachmentList,
  sort: "-created-date",
  parent: ["pageId"],
  params: paramsOf(pageAttachmentList, "pageId"),
  output: [
    { key: "id", type: "string", label: "Attachment ID" },
    { key: "title", type: "string", label: "File name" },
    { key: "mediaType", type: "string", label: "Media type" },
    { key: "fileSize", type: "number", label: "File size (bytes)" },
    { key: "pageId", type: "string", label: "Page ID" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "att-101",
    title: "diagram.png",
    mediaType: "image/png",
    fileSize: 2048,
    pageId: "page-101",
    createdAt: "2026-11-09T09:00:00.000Z",
  },
});
