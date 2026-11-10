import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/mural-list.ts";

export default pollFromListAction<{ workspaceId: string }>({
  key: "new-mural",
  title: "New Mural",
  description: "The run gets each newly created mural.",
  action: action as unknown as ActionDefinition,
  input: (p: { workspaceId?: string }) => ({
    workspaceId: p.workspaceId ?? "",
    sortBy: "lastCreated",
    limit: 99,
  }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  params: [{ key: "workspaceId", label: "Workspace ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Mural ID" }],
  sample: { id: "mural-1" },
  minIntervalMs: 300_000,
  maxPages: 1,
});
