import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import controlList from "../actions/control-list.ts";

export default pollFromListAction({
  key: "new-control",
  title: "New Control",
  description: "The run gets each new control in the selected workspace.",
  action: controlList as unknown as ActionDefinition,
  input: (params) => ({ ...params, size: 100, sort: "createdAt", sortDir: "DESC" }),
  params: (controlList.params ?? []).filter((param) => ["workspaceId"].includes(param.key)),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Control ID" }],
  sample: { id: "123" },
  maxPages: 1,
});
