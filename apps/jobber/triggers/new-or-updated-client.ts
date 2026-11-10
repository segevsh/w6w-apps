import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/client-list.ts";

/**
 * Wraps `client-list` sorted `UPDATED_AT` descending (the action offers no `CREATED_AT` sort, so
 * a brand-new client and an edited one both surface here; the id carries the `updatedAt` stamp, so
 * every edit is a new event).
 */
export default pollFromListAction({
  key: "new-or-updated-client",
  title: "New or Updated Client",
  description:
    "The run gets each client that is new or has been edited since the last check, polled from the existing `client-list` action sorted by `UPDATED_AT` descending.",
  action,
  input: () => ({ sortKey: "UPDATED_AT", sortDirection: "DESCENDING", first: 100 }),
  items: (result) => (result as { clients?: { nodes?: unknown[] } }).clients?.nodes ?? [],
  idOf: (item) => `${(item as { id?: unknown }).id}:${(item as { updatedAt?: unknown }).updatedAt}`,
  output: [
    { key: "id", type: "string", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "isCompany", type: "boolean", label: "Is a company" },
    { key: "isLead", type: "boolean", label: "Is a lead" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "Z2lkOi8vSm9iYmVyL0NsaWVudC8x",
    name: "Helen Myer",
    isCompany: false,
    isLead: false,
    createdAt: "2026-11-09T10:00:00Z",
    updatedAt: "2026-11-09T11:00:00Z",
  },
  maxPages: 1,
});
