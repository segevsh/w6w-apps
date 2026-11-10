import { snapshotList } from "../lib/snapshot.ts";
import { DeelClient } from "../lib/client.ts";

export default snapshotList({
  key: "new-legal-entity",
  title: "New Legal Entity",
  description: "The run gets each newly added legal entity.",
  // Vendor pager: query `cursor` (the list action sends `after_cursor`).
  list: (_p, ctx) => new DeelClient(ctx).requestAllNamedCursor("/legal-entities"),
  output: [
    { key: "id", type: "string", label: "Legal entity ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "le1", name: "Example GmbH" },
});
