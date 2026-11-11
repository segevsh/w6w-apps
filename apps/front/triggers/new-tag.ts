import action from "../actions/tag-list.ts";
import { bounded } from "../lib/triggers.ts";

/** `GET /company/tags` — the company's tags, one request (https://dev.frontapp.com/reference/list-company-tags, verified 2026-11-10). */
export default bounded({
  key: "new-tag",
  title: "New Tag",
  description: "The run gets each company tag newly created in Front (checked on a schedule).",
  action,
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "highlight", type: "string", label: "Colour" },
    { key: "is_private", type: "boolean", label: "Private" },
  ],
  sample: { id: "tag_7f8g", name: "vip", highlight: "purple", is_private: false },
});
