import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import checklistItemList from "../actions/checklist-item-list.ts";

export default pollFromListAction({
  key: "new-checklist-item",
  title: "New Checklist Item",
  description: "The run gets each newly created checklist item.",
  action: checklistItemList as unknown as ActionDefinition,
  input: (params) => ({
    checklistId: (params as { checklistId: number }).checklistId,
    items: 100,
    page: 1,
    sort: "-id",
  }),
  items: (r) => Array.isArray(r) ? r : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "checklistId", label: "Checklist ID", type: "number", required: true }],
  output: [{ key: "id", type: "string", label: "New Checklist Item ID" }],
  sample: { id: "example-1" },
  maxPages: 1,
});
