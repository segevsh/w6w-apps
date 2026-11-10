import { snapshotTrigger } from "../lib/triggers.ts";
import officesList from "../actions/offices-list.ts";

export default snapshotTrigger({
  key: "new-office",
  title: "New Office",
  description: "The run gets each office newly added to the Dialpad company.",
  action: officesList,
  output: [
    { key: "id", type: "string", label: "Office ID" },
    { key: "name", type: "string", label: "Office name" },
    { key: "state", type: "string", label: "Office state" },
    { key: "country", type: "string", label: "Country" },
  ],
  sample: { id: "5001", name: "Berlin", state: "active", country: "de" },
});
