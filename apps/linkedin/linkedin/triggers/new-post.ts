import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-posts-by-author.ts";

export default pollFromListAction({
  key: "new-post",
  title: "New Post",
  description: "The run gets each newly created new post.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({
    authorType: String(params.authorType ?? "person"),
    authorId: String(params.authorId ?? "1"),
    count: 100,
    start: 0,
    sortBy: "CREATED",
  }),
  items: (result) => (result as { elements?: unknown[] }).elements ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; jnid?: unknown }).id ?? (item as { jnid?: unknown }).jnid ?? "",
    ),
  params: [
    {
      key: "authorType",
      label: "Author type",
      type: "select",
      default: "person",
      options: [{ value: "person", label: "Person" }, {
        value: "organization",
        label: "Organization",
      }],
    },
    { key: "authorId", label: "Author ID", type: "string", required: true },
  ],
  output: [{ key: "id", type: "string", label: "New Post ID" }],
  sample: { id: "example" },
  maxPages: 1,
});
