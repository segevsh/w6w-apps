import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/mural-list.ts";

/**
 * Mural documents `sortBy=lastModified` as most recently modified first (getWorkspaceMurals), and
 * the Mural schema carries `updatedOn` (epoch ms). The dedupe id includes it, so an edited mural
 * is a new event.
 */
export default pollFromListAction<{ workspaceId: string }>({
  key: "new-or-updated-mural",
  title: "New or Updated Mural",
  description: "The run gets each mural in a workspace that is created or changed.",
  action: action as unknown as ActionDefinition,
  input: (p) => ({ workspaceId: p.workspaceId, sortBy: "lastModified", limit: 99 }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (x) => {
    const m = x as { id?: unknown; updatedOn?: unknown };
    return `${String(m.id ?? "")}:${String(m.updatedOn ?? "")}`;
  },
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
    { key: "updatedOn", type: "number", label: "Last updated (epoch ms)" },
  ],
  sample: {
    id: "ws12345.1608152669000",
    title: "Sprint planning",
    workspaceId: "ws12345",
    status: "active",
    createdOn: 1608152669000,
    updatedOn: 1608152700000,
  },
  minIntervalMs: 300_000,
  maxPages: 1,
});
