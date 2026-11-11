import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import categoryList from "../actions/category-list.ts";

/** Newest-first via the documented `order=desc` query parameter (https://docs.mercury.com/reference/listtransactions). */
export default pollFromListAction({
  key: "new-category",
  title: "New Category",
  description: "The run gets each newly created custom category: id and name.",
  action: categoryList as ActionDefinition,
  input: () => ({ limit: 100, order: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Category ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "category-1", name: "Software" },
  maxPages: 1,
});
