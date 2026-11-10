import templateList from "../actions/template-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// GET /snippets answers with every template and snippet the user can access in one response (no
// paging; https://developer.mixmax.com/reference/snippets-get, verified 2026-11-10); diffed by id.
export default snapshotTrigger<Record<string, unknown>>({
  key: "new-template",
  title: "New Template",
  description: "The run gets each template or snippet that newly becomes accessible to the user.",
  action: templateList as never,
  input: () => ({}),
  output: [
    { key: "_id", type: "string", label: "Template ID" },
    { key: "title", type: "string", label: "Title" },
  ],
  sample: { _id: "template-sample-1", title: "Follow-up" },
});
