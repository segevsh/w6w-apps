import type { TriggerDefinition } from "@w6w/types";
import projectList from "../actions/project-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /projects` (https://developers.everhour.com/api-reference/projects/get-all-projects.md)
 * is paged by `page`/`limit` with no documented order, so every page is read (100 per page, up to
 * 10 pages) and diffed as a snapshot; only additions emit.
 */
const trigger: TriggerDefinition = snapshotTrigger({
  key: "new-project",
  title: "New Project",
  description: "The run gets each project newly visible to the API key's owner in Everhour.",
  noun: "projects",
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "board or list" },
    { key: "client", type: "number", label: "Client ID" },
    { key: "users", type: "array", label: "Assigned user IDs" },
    { key: "billing", type: "object", label: "Billing" },
  ],
  sample: {
    id: "ev:1234567890",
    name: "Website redesign",
    type: "list",
    client: 101,
    users: [1304],
    billing: { type: "hourly" },
  },
  read: (_params, page, ctx) => projectList.execute({ limit: 100, page }, ctx),
  keyOf: (item) => String((item as { id?: unknown }).id ?? ""),
});

export default trigger;
