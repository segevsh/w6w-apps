import { pollFromListAction } from "../../_shared/poll/mod.ts";
import templateList from "../actions/template-list.ts";

// GET /snippets sorts by `name` unless told otherwise; `sort=createdAt&sortAscending=false` puts
// the newest first (https://developer.mixmax.com/reference/snippets), so page 1 of 50 is the feed.
export default pollFromListAction({
  key: "new-template",
  title: "New Template",
  description: "The run gets each template or snippet that newly becomes accessible to the user.",
  action: templateList,
  input: () => ({ sort: "createdAt", sortAscending: false, limit: 50 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  output: [
    { key: "_id", type: "string", label: "Template ID" },
    { key: "title", type: "string", label: "Title" },
  ],
  sample: { _id: "template-sample-1", title: "Follow-up" },
  maxPages: 1,
});
