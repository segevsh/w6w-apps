import { createdTrigger } from "../lib/triggers.ts";

/** A Pipedrive `create.person` webhook (registered through the API). */
export default createdTrigger({
  key: "new-person",
  title: "New Person",
  description: "Fires when a person is created. The run gets the new person.",
  object: "person",
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "owner_id", type: "string", label: "Owner ID" },
    { key: "org_id", type: "string", label: "Organization ID" },
    { key: "add_time", type: "string", label: "Added at" },
  ],
  sample: {
    id: "7",
    name: "Ada Lovelace",
    owner_id: "1234",
    org_id: "5",
    add_time: "2026-11-10T09:30:00Z",
  },
});
