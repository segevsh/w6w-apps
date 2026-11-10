import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import riskList from "../actions/risk-list.ts";

export default pollFromListAction({
  key: "new-risk",
  title: "New Risk",
  description: "The run gets each new risk in the selected risk register.",
  action: riskList as unknown as ActionDefinition,
  input: (params) => ({ ...params, size: 100, sort: "createdAt", sortDir: "DESC" }),
  params: (riskList.params ?? []).filter((param) => ["riskRegisterId"].includes(param.key)),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Risk ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
