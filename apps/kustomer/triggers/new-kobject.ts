import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import listAction from "../actions/kobject-list.ts";

const action = listAction as unknown as ActionDefinition;

export default pollFromListAction({
  key: "new-kobject",
  title: "New Custom Object",
  description:
    "The run gets each newly created record of the chosen Klass (custom object type), oldest first, polled from the existing `kobject-list` action with `sort=desc` (Kustomer orders KObjects by `createdAt`).",
  action,
  params: [
    {
      key: "name",
      label: "Klass name",
      type: "string",
      required: true,
      default: "",
      hint: "The Klass's machine name, e.g. `order`.",
    },
  ],
  input: (params) => {
    const name = String((params as { name?: unknown }).name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    return { name, sort: "desc", page: 1, pageSize: 100 };
  },
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "KObject ID" },
    { key: "attributes", type: "object", label: "KObject attributes (title, createdAt, custom)" },
  ],
  sample: {
    id: "5f0a1b2c3d4e5f6a7b8c9d0e",
    type: "kobject",
    attributes: { title: "Order 4417", createdAt: "2026-11-09T10:00:00.000Z" },
  },
  maxPages: 1,
});
