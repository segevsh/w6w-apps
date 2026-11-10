import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import listDeletedItems from "../actions/list-deleted-items.ts";

export default pollFromListAction({
  key: "new-deleted-item",
  title: "New Deleted Item",
  description: "The run gets each recently deleted directory item.",
  action: listDeletedItems as unknown as ActionDefinition,
  input: (params: { itemType: string }) => ({
    ...params,
    orderby: "deletedDateTime desc",
    top: 100,
    advancedQuery: true,
  }),
  items: (result) => (result as { value?: unknown[] }).value ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{
    key: "itemType",
    label: "Item type",
    type: "select",
    required: true,
    default: "user",
    options: [{ value: "user", label: "Users" }, { value: "group", label: "Groups" }, {
      value: "application",
      label: "Applications",
    }, { value: "servicePrincipal", label: "Service principals" }],
  }],
  output: [{ key: "id", type: "string", label: "Directory object ID" }],
  sample: { id: "deleted-new", deletedDateTime: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
