import type { ActionDefinition } from "@w6w/types";
import { odataFeed } from "../lib/triggers.ts";
import clientList from "../actions/client-list.ts";

/** OData `$orderby` newest-first; `createdAt`/`updatedAt` are on the entity ($metadata, verified 2026-11-10). */
export default odataFeed({
  key: "new-client",
  title: "New Client",
  description: "The run gets each newly created client: id, name, code, status and timestamps.",
  action: clientList as ActionDefinition,
  orderBy: "createdAt desc",
  output: [
    { key: "id", type: "string", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "client-1",
    name: "Acme Ltd",
    code: "ACME",
    status: "Active",
    createdAt: "2026-11-09T09:00:00Z",
    updatedAt: "2026-11-09T09:00:00Z",
  },
});
