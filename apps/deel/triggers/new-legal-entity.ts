import { snapshotList } from "../lib/snapshot.ts";
import legalEntityList from "../actions/legal-entity-list.ts";

export default snapshotList({
  key: "new-legal-entity",
  title: "New Legal Entity",
  description: "The run gets each newly added legal entity.",
  action: legalEntityList,
  output: [
    { key: "id", type: "string", label: "Legal entity ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "le1", name: "Example GmbH" },
});
