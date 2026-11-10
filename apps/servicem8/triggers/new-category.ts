import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/category-list.ts";

interface Item {
  id?: string | number;
  uuid?: string;
}

const newCategory = pollFromListAction({
  key: "new-category",
  title: "New Category",
  description: "The run gets each newly created category.",
  action,
  input: (_params) => ({ sort: "created_at DESC" }),
  items: (result) => {
    const r = result as { items?: unknown[] };
    return (r.items ?? []);
  },
  idOf: (item) => {
    const value = item as Item;
    return String(value.uuid ?? value.id ?? "");
  },
  params: action.params,
  output: [{ key: "uuid", type: "string", label: "Category ID" }],
  sample: { uuid: "category-a" },
  maxPages: 1,
});

export default newCategory;
