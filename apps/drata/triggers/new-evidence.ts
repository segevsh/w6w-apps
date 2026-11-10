import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import evidenceList from "../actions/evidence-list.ts";

export default pollFromListAction({
  key: "new-evidence",
  title: "New Evidence",
  description: "The run gets each new evidence item in the selected workspace.",
  action: evidenceList as unknown as ActionDefinition,
  input: (params) => ({ ...params, size: 100, sort: "createdAt", sortDir: "DESC" }),
  params: (evidenceList.params ?? []).filter((param) => ["workspaceId"].includes(param.key)),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Evidence ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
