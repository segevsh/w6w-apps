import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/mural-list.ts";

/** Mural documents `sortBy=lastCreated` as most recent first (getWorkspaceMurals). */
export default pollFromListAction<{ workspaceId: string }>({
  key: "new-mural",
  title: "New Mural",
  description: "The run gets each newly created mural in a workspace.",
  action: action as unknown as ActionDefinition,
  input: (p) => ({ workspaceId: p.workspaceId, sortBy: "lastCreated", limit: 99 }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  params: [{
    key: "workspaceId",
    label: "Workspace ID",
    type: "string",
    required: true,
    hint: "The workspace to watch, e.g. from List Workspaces.",
  }],
  output: [
    { key: "id", type: "string", label: "Mural ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "workspaceId", type: "string", label: "Workspace ID" },
    { key: "status", type: "string", label: "active or archived" },
    { key: "createdOn", type: "number", label: "Created (epoch ms)" },
  ],
  sample: {
    id: "ws12345.1608152669000",
    title: "Sprint planning",
    workspaceId: "ws12345",
    status: "active",
    createdOn: 1608152669000,
  },
  minIntervalMs: 300_000,
  maxPages: 1,
});
