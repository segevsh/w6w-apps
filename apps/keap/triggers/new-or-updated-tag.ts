import tagList from "../actions/tag-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each Keap tag that is new or was edited (`GET /rest/v2/tags`, `order_by=update_time desc`). Brief 9.1 (a), 9.2. */
export default feedTrigger({
  key: "new-or-updated-tag",
  title: "New or Updated Tag",
  description:
    "The run gets each Keap tag that is new or was edited (`GET /rest/v2/tags`, `order_by=update_time desc`).",
  action: tagList,
  list: "tags",
  orderBy: "update_time desc",
  stamp: "update_time",
  output: [{ key: "id", type: "string", label: "ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "update_time", type: "string", label: "Updated at" }],
  sample: { id: "1", name: "VIP", update_time: "2026-11-10T12:30:00.000Z" },
});
