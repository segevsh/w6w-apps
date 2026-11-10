import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/book-list.ts";

export default pollFromListAction({
  key: "new-book",
  title: "New Book",
  description: "The run gets each newly created book.",
  action,
  input: () => ({ updated__gt: "1970-01-01T00:00:00Z", page_size: 100, page: 1 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Book ID" }],
  sample: { id: 1, title: "Book" },
  maxPages: 1,
});
