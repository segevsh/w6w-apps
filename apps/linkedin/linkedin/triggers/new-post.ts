import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/list-posts-by-author.ts";

export default pollFromListAction({
  key: "new-post",
  title: "New Post",
  description:
    "The run gets each newly created post, oldest first, polled from the existing `list-posts-by-author` action sorted by creation time descending (`sortBy=CREATED`).",
  action: action as unknown as ActionDefinition,
  input: (params) => ({
    authorType: String(params.authorType ?? "person"),
    authorId: String(params.authorId ?? ""),
    count: 100,
    start: 0,
    sortBy: "CREATED",
  }),
  items: (result) => (result as { elements?: unknown[] }).elements ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  params: [
    {
      key: "authorType",
      label: "Author type",
      type: "select",
      default: "person",
      options: [
        { value: "person", label: "Person" },
        { value: "organization", label: "Organization" },
      ],
    },
    { key: "authorId", label: "Author ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Post ID" },
    { key: "author", type: "string", label: "Author URN" },
    { key: "commentary", type: "string", label: "Post text" },
    { key: "createdAt", type: "number", label: "Created at (ms)" },
    { key: "lastModifiedAt", type: "number", label: "Last modified at (ms)" },
  ],
  sample: {
    id: "urn:li:share:7000000000000000001",
    author: "urn:li:person:abc123",
    commentary: "Hello",
    createdAt: 1762682400000,
    lastModifiedAt: 1762682400000,
  },
  maxPages: 1,
});
