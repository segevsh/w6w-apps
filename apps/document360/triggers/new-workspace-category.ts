import type { ActionDefinition } from "@w6w/types";
import workspaceCategoryList from "../actions/workspace-category-list.ts";
import { boundedListSnapshot } from "../lib/triggers.ts";

export default boundedListSnapshot({
  key: "new-workspace-category",
  title: "New Workspace Category",
  description:
    "The run gets each new category or sub-category, at any depth, in the workspace you choose.",
  action: workspaceCategoryList as unknown as ActionDefinition,
  params: workspaceCategoryList.params,
  input: (params) => params,
  childrenKey: "child_categories",
  output: [{ key: "id", type: "string", label: "Category ID" }],
  sample: { id: "category-101", name: "Getting started" },
});
