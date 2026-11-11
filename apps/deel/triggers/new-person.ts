import { snapshotList } from "../lib/snapshot.ts";
import personList from "../actions/person-list.ts";

export default snapshotList({
  key: "new-person",
  title: "New Person",
  description: "The run gets each worker newly added to the organization.",
  action: personList,
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: "p1", first_name: "Ada", last_name: "Lovelace", email: "ada@example.com" },
});
