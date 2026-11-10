import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/raindrop-search.ts";

export default pollFromListAction({
  key: "new-bookmark",
  title: "New Bookmark",
  description: "The run gets each newly saved bookmark (collection 0: everything except Trash).",
  action: action as never,
  input: () => ({ collectionId: 0, sort: "-created", perpage: 50, page: 0 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  output: [{ key: "_id", type: "number", label: "Bookmark ID" }, {
    key: "title",
    type: "string",
    label: "Title",
  }, { key: "link", type: "string", label: "URL" }],
  sample: { _id: 42, title: "Example", link: "https://example.com/" },
  maxPages: 1,
});
