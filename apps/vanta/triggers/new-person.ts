import personList from "../actions/person-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /v1/people` through `person-list`, snapshot-diffed. */
export default snapshotTrigger({
  key: "new-person",
  title: "New Person",
  description: "The run gets each person newly added to the Vanta program.",
  action: personList,
  listKey: "people",
  idKey: "id",
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "emailAddress", type: "string", label: "Email address" },
    { key: "name", type: "object", label: "Name" },
  ],
  sample: { id: "person-1", emailAddress: "alex@example.com", name: { display: "Alex Doe" } },
});
