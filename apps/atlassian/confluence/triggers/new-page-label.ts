import pageLabelList from "../actions/page-label-list.ts";
import { paramsOf, snapshotRows } from "../lib/triggers.ts";

/**
 * Wraps `page-label-list` for the page the user picks. GET /wiki/api/v2/pages/{id}/labels documents
 * no sort order, but the labels on one page are a small collection read whole in one request
 * (up to 250 per request; https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-label/,
 * verified 2026-11-10), so it is polled as a snapshot and only additions are emitted.
 */
export default snapshotRows({
  key: "new-page-label",
  title: "New Page Label",
  description: "The run gets each label newly added to the selected page.",
  action: pageLabelList,
  parent: ["pageId"],
  params: paramsOf(pageLabelList, "pageId"),
  all: false,
  output: [
    { key: "change", type: "string", label: "Change (added)" },
    { key: "key", type: "string", label: "Label ID" },
    { key: "values", type: "object", label: "Label (id, name, prefix)" },
  ],
  sample: {
    change: "added",
    key: "label-101",
    values: { id: "label-101", name: "ready", prefix: "global" },
  },
});
