import { snapshotFeed } from "../lib/triggers.ts";
import action from "../actions/property-list.ts";

/**
 * `property-list` (`properties` connection). The query takes no sort argument, so the properties
 * are walked 100 at a time and diffed. An optional `clientId` narrows the watch to one client.
 */
export default snapshotFeed({
  key: "new-property",
  title: "New Property",
  description: "The run gets each property newly added in Jobber, for all clients or one client.",
  action,
  field: "properties",
  params: [
    {
      key: "clientId",
      label: "Client ID",
      type: "string",
      hint:
        "Only properties of this client (from List Clients). Leave empty to watch every client.",
    },
  ],
  input: ({ params, after, first }) => ({ clientId: params.clientId || undefined, first, after }),
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "string", label: "Property ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address", type: "object", label: "Address" },
  ],
  sample: {
    id: "Z2lkOi8vSm9iYmVyL1Byb3BlcnR5LzE=",
    name: null,
    address: { id: "Z2lkOi8vSm9iYmVyL0FkZHJlc3MvMQ==", street1: "1 Main St", city: "Edmonton" },
  },
});
