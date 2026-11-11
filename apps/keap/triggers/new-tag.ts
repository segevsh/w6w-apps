import tagList from "../actions/tag-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each new Keap tag, newest first (`GET /rest/v2/tags`, `order_by=create_time desc`). Brief 9.1 (a). */
export default feedTrigger({
  key: "new-tag",
  title: "New Tag",
  description:
    "The run gets each new Keap tag, newest first (`GET /rest/v2/tags`, `order_by=create_time desc`).",
  action: tagList,
  list: "tags",
  orderBy: "create_time desc",
  output: [{ key: "id", type: "string", label: "ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "create_time", type: "string", label: "Created at" }],
  sample: { id: "1", name: "VIP", create_time: "2026-11-10T12:00:00.000Z" },
});
